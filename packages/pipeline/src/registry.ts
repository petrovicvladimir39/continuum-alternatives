import { db, documents, inArray, sql, sources } from "@continuum/db";
import { notifyQueue, pendingCounts } from "./alert";
import { mapFilingById } from "./filings-map";
import { parseSourceConfig } from "./config";
import {
  ARTICLE_DELAY_MS,
  FETCH_TIMEOUT_MS,
  USER_AGENT,
  delay,
  fetchSimpleArticle,
  partitionByExisting,
  sha256,
  type CrawlStats,
} from "./crawl-shared";
import { processDocumentFile, terminateOcrWorkers } from "./extract-text";
import { emitDocumentStored } from "./extraction/extract";
import { REGISTRY_HANDLERS } from "./registries";
import type { RegistryItem } from "./registries";

/** Which of these caseRefs already exist in documents.meta->>'caseRef'? */
export async function existingCaseRefs(refs: string[]): Promise<Set<string>> {
  if (refs.length === 0) {
    return new Set();
  }
  const rows = await db
    .select({ ref: sql<string>`${documents.meta}->>'caseRef'` })
    .from(documents)
    .where(inArray(sql`${documents.meta}->>'caseRef'`, refs));
  return new Set(rows.map((row) => row.ref));
}

async function fetchBinary(url: string): Promise<{ buffer: Buffer; mime: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const mime = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  return { buffer: Buffer.from(await response.arrayBuffer()), mime };
}

export async function fetchRegistrySource(
  source: typeof sources.$inferSelect,
): Promise<CrawlStats> {
  const config = parseSourceConfig(source.config);
  if (config.handler === undefined) {
    throw new Error(`Source "${source.name}" has no config.handler`);
  }
  const handler = REGISTRY_HANDLERS[config.handler];
  if (handler === undefined) {
    throw new Error(
      `Unknown registry handler "${config.handler}"; registered: ${Object.keys(REGISTRY_HANDLERS).join(", ")}`,
    );
  }

  const { items } = await handler(source);
  const stats: CrawlStats = {
    itemsInFeed: items.length,
    newArticles: 0,
    skippedExisting: 0,
    errors: [],
  };
  let mappedCount = 0;

  // Same windowing as RSS/firecrawl: the cap bounds items considered from the
  // head of the (newest-first) listing, so re-runs report zero new.
  const window = items.slice(0, config.maxItemsPerRun);
  let isExisting: (item: RegistryItem) => boolean;
  if (config.dedupKey === "caseRef") {
    const refs = window
      .map((item) => item.meta.caseRef)
      .filter((ref): ref is string => ref !== undefined && ref !== "");
    const known = await existingCaseRefs(refs);
    isExisting = (item) => item.meta.caseRef !== undefined && known.has(item.meta.caseRef);
  } else {
    const { existing } = await partitionByExisting(window.map((item) => item.url));
    const existingSet = new Set(existing);
    isExisting = (item) => existingSet.has(item.url);
  }

  try {
    for (const item of window) {
      if (isExisting(item)) {
        stats.skippedExisting += 1;
        continue;
      }
      try {
        if (stats.newArticles > 0) {
          await delay(ARTICLE_DELAY_MS);
        }
        let contentText: string;
        const meta: Record<string, string> = { ...item.meta };
        if (config.itemsArePdf || item.url.toLowerCase().endsWith(".pdf")) {
          const { buffer, mime } = await fetchBinary(item.url);
          const extracted = await processDocumentFile(
            buffer,
            mime === "" ? "application/pdf" : mime,
            config.ocrLangs,
          );
          contentText = extracted.text;
          meta.extraction = extracted.extraction;
          if (extracted.extraction === "needs-ocr") {
            meta.needsOcr = "true";
          }
        } else {
          contentText = (await fetchSimpleArticle(item.url)).contentText;
        }
        const inserted = await db
          .insert(documents)
          .values({
            sourceId: source.id,
            url: item.url,
            title: item.title,
            docType: "filing",
            language: config.language ?? null,
            contentText,
            contentHash: sha256(contentText),
            fetchedAt: new Date(),
            meta,
          })
          .returning({ id: documents.id });
        if (inserted[0] !== undefined) {
          // ALSU filings map deterministically into proposed facts — no
          // event, no LLM. Other registry docs go the extraction route.
          const mapped = await mapFilingById(inserted[0].id).catch((err) => {
            console.warn(
              `filing map failed for ${inserted[0]?.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
            return null;
          });
          if (mapped !== null) {
            mappedCount += 1;
          } else {
            await emitDocumentStored(inserted[0].id);
          }
        }
        stats.newArticles += 1;
      } catch (err) {
        stats.errors.push({
          url: item.url,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await terminateOcrWorkers();
  }
  if (mappedCount > 0) {
    await notifyQueue(await pendingCounts());
  }
  return stats;
}

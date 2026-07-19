import { and, db, desc, documents, eq, ingestionRuns, sources } from "@continuum/db";
import {
  CONTENT_TEXT_CAP,
  FETCH_TIMEOUT_MS,
  USER_AGENT,
  sha256,
  type CrawlStats,
} from "./crawl-shared";
import { fetchFirecrawlIndexSource } from "./firecrawl";
import { fetchRegistrySource } from "./registry";
import { fetchRssSource } from "./rss";

export type FetchSourceResult =
  { kind: "http_simple"; changed: boolean; documentId?: string } | ({ kind: "crawl" } & CrawlStats);

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title = match?.[1]?.trim();
  return title ? title.slice(0, 500) : null;
}

async function fetchHttpSimple(
  source: typeof sources.$inferSelect,
): Promise<{ result: FetchSourceResult; bytes: number }> {
  if (!source.url) {
    throw new Error(`Source "${source.name}" has no url`);
  }
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${source.url}`);
  }
  const raw = await response.text();
  const bytes = Buffer.byteLength(raw, "utf8");
  const normalized = raw.replace(/\s+/g, " ").trim();
  const contentHash = sha256(normalized);

  const previous = await db
    .select({ contentHash: documents.contentHash })
    .from(documents)
    .where(and(eq(documents.sourceId, source.id), eq(documents.url, source.url)))
    .orderBy(desc(documents.fetchedAt))
    .limit(1);

  if (previous[0]?.contentHash === contentHash) {
    return { result: { kind: "http_simple", changed: false }, bytes };
  }
  const inserted = await db
    .insert(documents)
    .values({
      sourceId: source.id,
      url: source.url,
      title: extractTitle(raw),
      language: null,
      docType: "html",
      contentHash,
      contentText: normalized.slice(0, CONTENT_TEXT_CAP),
      fetchedAt: new Date(),
    })
    .returning({ id: documents.id });
  const documentId = inserted[0]?.id;
  return {
    result:
      documentId === undefined
        ? { kind: "http_simple", changed: true }
        : { kind: "http_simple", changed: true, documentId },
    bytes,
  };
}

/**
 * Dispatches on sources.fetch_method ('http_simple' | 'rss' | 'firecrawl_index').
 * Every invocation — success or failure — writes an ingestion_runs row and
 * updates sources.last_run_at/last_run_status.
 */
export async function fetchSource(sourceId: string): Promise<FetchSourceResult> {
  const sourceRows = await db.select().from(sources).where(eq(sources.id, sourceId));
  const source = sourceRows[0];
  if (!source) {
    throw new Error(`Unknown source id: ${sourceId}`);
  }

  const startedAt = new Date();
  const t0 = Date.now();
  let status: "ok" | "error" = "ok";
  let errorText: string | null = null;
  let runStats: Record<string, unknown> = {};
  let result: FetchSourceResult | null = null;

  try {
    switch (source.fetchMethod) {
      case "rss": {
        const stats = await fetchRssSource(source);
        result = { kind: "crawl", ...stats };
        runStats = { ...stats };
        break;
      }
      case "firecrawl_index": {
        const stats = await fetchFirecrawlIndexSource(source);
        result = { kind: "crawl", ...stats };
        runStats = { ...stats };
        break;
      }
      case "registry_custom": {
        const stats = await fetchRegistrySource(source);
        result = { kind: "crawl", ...stats };
        runStats = { ...stats };
        break;
      }
      default: {
        const { result: httpResult, bytes } = await fetchHttpSimple(source);
        result = httpResult;
        runStats = {
          changed: httpResult.kind === "http_simple" ? httpResult.changed : false,
          ...(httpResult.kind === "http_simple" && httpResult.documentId !== undefined
            ? { documentId: httpResult.documentId }
            : {}),
          bytes,
        };
        break;
      }
    }
    return result;
  } catch (err) {
    status = "error";
    errorText = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    runStats.ms = Date.now() - t0;
    await db.insert(ingestionRuns).values({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date(),
      status,
      stats: runStats,
      error: errorText,
    });
    await db
      .update(sources)
      .set({ lastRunAt: startedAt, lastRunStatus: status })
      .where(eq(sources.id, source.id));
  }
}

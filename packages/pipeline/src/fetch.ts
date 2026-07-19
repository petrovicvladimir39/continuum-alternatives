import { createHash } from "node:crypto";
import { and, db, desc, documents, eq, ingestionRuns, sources } from "@continuum/db";

const USER_AGENT = "ContinuumBot/0.1 (+https://continuumalternatives.com)";
const TIMEOUT_MS = 20_000;
const CONTENT_TEXT_CAP = 500_000;

export type FetchSourceResult = { changed: boolean; documentId?: string };

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title = match?.[1]?.trim();
  return title ? title.slice(0, 500) : null;
}

/**
 * Fetches a source over plain HTTP, hashes the normalized body, and inserts a
 * documents row only when the hash differs from the most recent document for
 * (source_id, url). Every invocation — success or failure — writes an
 * ingestion_runs row and updates sources.last_run_at/last_run_status.
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
  let result: FetchSourceResult = { changed: false };
  let bytes = 0;

  try {
    if (!source.url) {
      throw new Error(`Source "${source.name}" has no url`);
    }
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${source.url}`);
    }
    const raw = await response.text();
    bytes = Buffer.byteLength(raw, "utf8");
    const normalized = raw.replace(/\s+/g, " ").trim();
    const contentHash = createHash("sha256").update(normalized).digest("hex");

    const previous = await db
      .select({ contentHash: documents.contentHash })
      .from(documents)
      .where(and(eq(documents.sourceId, source.id), eq(documents.url, source.url)))
      .orderBy(desc(documents.fetchedAt))
      .limit(1);

    if (previous[0]?.contentHash === contentHash) {
      result = { changed: false };
    } else {
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
      result = documentId === undefined ? { changed: true } : { changed: true, documentId };
    }
    return result;
  } catch (err) {
    status = "error";
    errorText = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const ms = Date.now() - t0;
    await db.insert(ingestionRuns).values({
      sourceId: source.id,
      startedAt,
      finishedAt: new Date(),
      status,
      stats: {
        changed: result.changed,
        ...(result.documentId !== undefined ? { documentId: result.documentId } : {}),
        bytes,
        ms,
      },
      error: errorText,
    });
    await db
      .update(sources)
      .set({ lastRunAt: startedAt, lastRunStatus: status })
      .where(eq(sources.id, source.id));
  }
}

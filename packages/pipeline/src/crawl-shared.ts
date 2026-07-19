import { createHash } from "node:crypto";
import { db, documents, inArray } from "@continuum/db";

export const USER_AGENT = "ContinuumBot/0.1 (+https://continuumalternatives.com)";
export const FETCH_TIMEOUT_MS = 20_000;
export const CONTENT_TEXT_CAP = 500_000;
export const ARTICLE_DELAY_MS = 2_000;

export type ItemError = { url: string; message: string };

export type CrawlStats = {
  itemsInFeed: number;
  newArticles: number;
  skippedExisting: number;
  errors: ItemError[];
};

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Regex-level script/style stripping — full parsing arrives with extraction. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, " ");
}

export function applyLinkPattern(links: string[], pattern: string | undefined): string[] {
  if (pattern === undefined) {
    return links;
  }
  const regex = new RegExp(pattern);
  return links.filter((link) => regex.test(link));
}

/** Source-independent dedup: which of these urls already exist in documents? */
export async function partitionByExisting(
  urls: string[],
): Promise<{ fresh: string[]; existing: string[] }> {
  if (urls.length === 0) {
    return { fresh: [], existing: [] };
  }
  const rows = await db
    .select({ url: documents.url })
    .from(documents)
    .where(inArray(documents.url, urls));
  const known = new Set(rows.map((row) => row.url));
  return {
    fresh: urls.filter((url) => !known.has(url)),
    existing: urls.filter((url) => known.has(url)),
  };
}

export async function fetchSimpleArticle(url: string): Promise<{ contentText: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const raw = await response.text();
  return { contentText: stripHtml(raw).slice(0, CONTENT_TEXT_CAP) };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { XMLParser } from "fast-xml-parser";
import { db, documents, sources } from "@continuum/db";
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
import { emitDocumentStored } from "./extraction/extract";
import { scrapePage } from "./firecrawl";

export type FeedItem = { title: string; url: string; publishedAt?: string };

function textValue(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim();
  }
  if (node !== null && typeof node === "object") {
    const record = node as Record<string, unknown>;
    for (const key of ["#text", "__cdata"]) {
      const value = record[key];
      if (typeof value === "string" || typeof value === "number") {
        return String(value).trim();
      }
    }
  }
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function atomLink(node: unknown): string {
  const links = asArray(node as Record<string, unknown> | Record<string, unknown>[] | undefined);
  let fallback = "";
  for (const link of links) {
    if (typeof link === "string") {
      return link;
    }
    const href = typeof link["@_href"] === "string" ? link["@_href"] : "";
    const rel = typeof link["@_rel"] === "string" ? link["@_rel"] : "";
    if (href !== "" && (rel === "" || rel === "alternate")) {
      return href;
    }
    if (fallback === "" && href !== "") {
      fallback = href;
    }
  }
  return fallback;
}

/** Parses RSS 2.0 or Atom XML into feed items; relative links resolve against feedUrl. */
export function parseFeed(xml: string, feedUrl: string): FeedItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml) as Record<string, unknown>;
  const items: FeedItem[] = [];

  const push = (rawUrl: string, title: string, publishedAt: string) => {
    if (rawUrl === "") {
      return;
    }
    let url: string;
    try {
      url = new URL(rawUrl, feedUrl).toString();
    } catch {
      return;
    }
    items.push({
      title: title === "" ? url : title,
      url,
      ...(publishedAt !== "" ? { publishedAt } : {}),
    });
  };

  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  for (const item of asArray(channel?.item as Record<string, unknown>[] | undefined)) {
    push(textValue(item.link), textValue(item.title), textValue(item.pubDate));
  }

  const feed = parsed.feed as Record<string, unknown> | undefined;
  for (const entry of asArray(feed?.entry as Record<string, unknown>[] | undefined)) {
    push(
      atomLink(entry.link),
      textValue(entry.title),
      textValue(entry.published) || textValue(entry.updated),
    );
  }

  return items;
}

export async function fetchRssSource(source: typeof sources.$inferSelect): Promise<CrawlStats> {
  if (!source.url) {
    throw new Error(`Source "${source.name}" has no url`);
  }
  const config = parseSourceConfig(source.config);
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for feed ${source.url}`);
  }
  const items = parseFeed(await response.text(), source.url);

  const stats: CrawlStats = {
    itemsInFeed: items.length,
    newArticles: 0,
    skippedExisting: 0,
    errors: [],
  };
  // The cap bounds items considered from the head of the feed, so an
  // immediate re-run sees the same window and reports zero new articles.
  const window = items.slice(0, config.maxItemsPerRun);
  const { existing } = await partitionByExisting(window.map((item) => item.url));
  const existingSet = new Set(existing);

  for (const item of window) {
    if (existingSet.has(item.url)) {
      stats.skippedExisting += 1;
      continue;
    }
    try {
      if (stats.newArticles > 0) {
        await delay(ARTICLE_DELAY_MS);
      }
      const contentText =
        config.articleFetch === "firecrawl"
          ? (await scrapePage(item.url)).markdown
          : (await fetchSimpleArticle(item.url)).contentText;
      const inserted = await db
        .insert(documents)
        .values({
          sourceId: source.id,
          url: item.url,
          title: item.title,
          docType: "article",
          language: config.language ?? null,
          contentText,
          contentHash: sha256(contentText),
          fetchedAt: new Date(),
        })
        .returning({ id: documents.id });
      if (inserted[0] !== undefined) {
        await emitDocumentStored(inserted[0].id);
      }
      stats.newArticles += 1;
    } catch (err) {
      stats.errors.push({
        url: item.url,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return stats;
}

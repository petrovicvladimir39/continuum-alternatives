import Firecrawl from "@mendable/firecrawl-js";
import { db, documents, sources } from "@continuum/db";
import { parseSourceConfig } from "./config";
import { emitDocumentStored } from "./extraction/extract";
import {
  ARTICLE_DELAY_MS,
  CONTENT_TEXT_CAP,
  applyLinkPattern,
  delay,
  fetchSimpleArticle,
  partitionByExisting,
  sha256,
  type CrawlStats,
} from "./crawl-shared";

let client: Firecrawl | null = null;

function getClient(): Firecrawl {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FIRECRAWL_API_KEY is not set — required for firecrawl_index sources and articleFetch: 'firecrawl'",
    );
  }
  client ??= new Firecrawl({ apiKey });
  return client;
}

export type ScrapeResult = { markdown: string; title: string | null };
export type ScrapeFn = (url: string) => Promise<ScrapeResult>;

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const document = await getClient().scrape(url, { formats: ["markdown"] });
  return {
    markdown: (document.markdown ?? "").slice(0, CONTENT_TEXT_CAP),
    title: document.metadata?.title ?? null,
  };
}

/**
 * HARD BUDGET GUARD — a single firecrawl_index run may never make more than
 * (1 + maxItemsPerRun) Firecrawl calls: one for the index, one per new article.
 */
export function createBudget(maxCalls: number): () => void {
  let used = 0;
  return () => {
    used += 1;
    if (used > maxCalls) {
      throw new Error(`Firecrawl budget exceeded: call ${used} > allowed ${maxCalls}`);
    }
  };
}

export function extractMarkdownLinks(markdown: string): string[] {
  const links = new Set<string>();
  for (const match of markdown.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (match[1] !== undefined) {
      links.add(match[1]);
    }
  }
  for (const match of markdown.matchAll(/<(https?:\/\/[^>\s]+)>/g)) {
    if (match[1] !== undefined) {
      links.add(match[1]);
    }
  }
  return [...links];
}

export async function fetchFirecrawlIndexSource(
  source: typeof sources.$inferSelect,
  scrape: ScrapeFn = scrapePage,
): Promise<CrawlStats> {
  if (!source.url) {
    throw new Error(`Source "${source.name}" has no url`);
  }
  const config = parseSourceConfig(source.config);
  const spend = createBudget(1 + config.maxItemsPerRun);

  spend();
  const index = await scrape(source.url);
  const links = applyLinkPattern(extractMarkdownLinks(index.markdown), config.linkIncludePattern);

  const stats: CrawlStats = {
    itemsInFeed: links.length,
    newArticles: 0,
    skippedExisting: 0,
    errors: [],
  };
  // Same windowing as RSS: the cap bounds items considered, so re-runs
  // report zero new articles instead of walking deeper into the index.
  const window = links.slice(0, config.maxItemsPerRun);
  const { existing } = await partitionByExisting(window);
  const existingSet = new Set(existing);

  for (const link of window) {
    if (existingSet.has(link)) {
      stats.skippedExisting += 1;
      continue;
    }
    try {
      if (stats.newArticles > 0) {
        await delay(ARTICLE_DELAY_MS);
      }
      let contentText: string;
      let title: string | null = null;
      if (config.articleFetch === "firecrawl") {
        spend();
        const article = await scrape(link);
        contentText = article.markdown;
        title = article.title;
      } else {
        contentText = (await fetchSimpleArticle(link)).contentText;
      }
      const inserted = await db
        .insert(documents)
        .values({
          sourceId: source.id,
          url: link,
          title,
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
      stats.errors.push({ url: link, message: err instanceof Error ? err.message : String(err) });
    }
  }
  return stats;
}

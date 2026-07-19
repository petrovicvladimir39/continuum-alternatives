export const PIPELINE_PACKAGE = "placeholder";

export { inngest } from "./inngest";
export { fetchSource, type FetchSourceResult } from "./fetch";
export { sendAlert } from "./alert";
export { ingestHourly, ingestSource } from "./functions/ingest-hourly";
export { parseSourceConfig, type SourceConfig } from "./config";
export { parseFeed, fetchRssSource, type FeedItem } from "./rss";
export {
  createBudget,
  extractMarkdownLinks,
  fetchFirecrawlIndexSource,
  scrapePage,
  type ScrapeFn,
} from "./firecrawl";
export { applyLinkPattern, partitionByExisting, stripHtml, type CrawlStats } from "./crawl-shared";

import { ingestHourly, ingestSource } from "./functions/ingest-hourly";

/** Every pipeline function, for the Next.js serve route. */
export const functions = [ingestHourly, ingestSource];

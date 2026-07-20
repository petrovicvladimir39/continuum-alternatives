export const PIPELINE_PACKAGE = "placeholder";

export { inngest } from "./inngest";
export { extractDocument, type ExtractDocumentResult } from "./extraction/extract";
export { applyGuards, type GuardStats } from "./extraction/guards";
export {
  extractionResultSchema,
  FACT_TYPES,
  type ExtractionResult,
  type ExtractedItem,
} from "./extraction/schema";
export { extractDocumentFn } from "./functions/extract-document";
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
export { existingCaseRefs, fetchRegistrySource } from "./registry";
export {
  REGISTRY_HANDLERS,
  parseAlsuProdaje,
  parseAlsuStecajevi,
  type RegistryHandler,
  type RegistryItem,
} from "./registries";
export { processDocumentFile, terminateOcrWorkers } from "./extract-text";

import { extractDocumentFn } from "./functions/extract-document";
import { ingestHourly, ingestSource } from "./functions/ingest-hourly";

/** Every pipeline function, for the Next.js serve route. */
export const functions = [ingestHourly, ingestSource, extractDocumentFn];

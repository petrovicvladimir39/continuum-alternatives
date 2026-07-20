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
export { notifyQueue, pendingCounts, sendAlert } from "./alert";
export {
  bucketWeekly,
  detectAnomalies,
  isoWeekStart,
  notifyAnomalies,
  scanAnomalies,
  type AnomalyVerdict,
} from "./anomalies";
export { anomaliesWeekly } from "./functions/anomalies-weekly";
export { mapFilingById, mapFilingToFact, type MappedFiling } from "./filings-map";
export {
  composeDigest,
  deliverDigest,
  digestSubject,
  loadDigestSections,
  persistDraft,
  rankFacts,
  selectRecipients,
  FACT_PRIORITY,
  type DeliveryReport,
  type DigestComposition,
  type DigestFact,
  type DigestSection,
} from "./digest";
export { buildDigestEmail } from "./digest-email";
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
export {
  backfillEmbeddings,
  embedEntityText,
  embedQuery,
  voyageClient,
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  type EmbeddableEntity,
} from "./embeddings";

import { anomaliesWeekly } from "./functions/anomalies-weekly";
import { extractDocumentFn } from "./functions/extract-document";
import { ingestHourly, ingestSource } from "./functions/ingest-hourly";

/** Every pipeline function, for the Next.js serve route. */
export const functions = [ingestHourly, ingestSource, extractDocumentFn, anomaliesWeekly];

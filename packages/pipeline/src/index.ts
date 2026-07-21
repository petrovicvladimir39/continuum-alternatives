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
export { resolveLogo } from "./logos";
export { geocodeCity, normalizeCityName } from "./geocode";
export {
  applyEnrichmentGuards,
  enrichOrganization,
  enrichmentSchema,
  fetchCompanyText,
  proposedFieldsOf,
  type EnrichmentGuardStats,
  type EnrichmentRaw,
  type GuardedEnrichment,
} from "./enrich";
export {
  backfillEmbeddings,
  embedEntityText,
  embedQuery,
  voyageClient,
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  type EmbeddableEntity,
} from "./embeddings";

export { buildConfirmationEmail, sendConfirmationEmail } from "./subscription-email";
export { buildAlertEmail, deliverPendingAlerts, sendInstantAlertsForFact } from "./alerts";
export {
  BRIEF_MODEL,
  gatherBriefMaterial,
  generateEntityBrief,
  type BriefResult,
} from "./brief-compose";
export { guardBrief, INTERNAL_SOURCE_NAME, type BriefDraft } from "./brief-guards";
export { createContinuumMcpServer } from "./mcp-server";
export {
  buildWebhookPayload,
  deliverMemberWebhooks,
  signWebhookPayload,
  verifyWebhookSignature,
} from "./webhooks";
export { askFiling, DOC_CHAT_FREE_PER_DAY } from "./filing-chat";
export { guardFilingAnswer, NO_ANSWER_FALLBACK, type FilingAnswer } from "./filing-guards";
export {
  GROUNDED_ASKS_PER_MEMBER_PER_DAY,
  llmGroundAsk,
  sanitizeGroundedFilters,
  shouldInvokeGrounder,
} from "./ask-ground";
export {
  composeWatchdogBrief,
  currentWeekStart,
  runWatchdogWeekly,
  WATCHDOG_WEEKLY_BUDGET_USD,
} from "./watchdog-compose";

import { alertsDaily } from "./functions/alerts-daily";
import { webhooksDeliver } from "./functions/webhooks-deliver";
import { watchdogWeekly } from "./functions/watchdog-weekly";
import { anomaliesWeekly } from "./functions/anomalies-weekly";
import { articlesWeekly } from "./functions/articles-weekly";
import { digestWeeklyDraft } from "./functions/digest-weekly";
import { extractDocumentFn } from "./functions/extract-document";
import { ingestHourly, ingestSource } from "./functions/ingest-hourly";

export { digestAutodraftEnabled } from "./functions/digest-weekly";

/** Every pipeline function, for the Next.js serve route. articlesWeekly and
 * digestWeeklyDraft ship DISABLED (env-flag gated no-ops). */
export const functions = [
  ingestHourly,
  ingestSource,
  extractDocumentFn,
  anomaliesWeekly,
  articlesWeekly,
  digestWeeklyDraft,
  alertsDaily,
  webhooksDeliver,
  watchdogWeekly,
];

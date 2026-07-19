/**
 * Per-source crawl configuration, stored in sources.config (jsonb):
 *   maxItemsPerRun     — cap on new articles fetched per run (default 10)
 *   linkIncludePattern — regex string article links must match (firecrawl_index only)
 *   articleFetch       — 'simple' (plain HTTP, stripped HTML) | 'firecrawl' (markdown); default 'simple'
 *   language           — 2-letter code stamped onto stored documents
 */
export type SourceConfig = {
  maxItemsPerRun: number;
  linkIncludePattern?: string;
  articleFetch: "simple" | "firecrawl";
  language?: string;
};

export function parseSourceConfig(raw: unknown): SourceConfig {
  const record = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const maxItems = typeof record.maxItemsPerRun === "number" ? record.maxItemsPerRun : 10;
  return {
    maxItemsPerRun: Math.max(1, Math.floor(maxItems)),
    ...(typeof record.linkIncludePattern === "string" && record.linkIncludePattern !== ""
      ? { linkIncludePattern: record.linkIncludePattern }
      : {}),
    articleFetch: record.articleFetch === "firecrawl" ? "firecrawl" : "simple",
    ...(typeof record.language === "string" && /^[a-z]{2}$/i.test(record.language)
      ? { language: record.language.toLowerCase() }
      : {}),
  };
}

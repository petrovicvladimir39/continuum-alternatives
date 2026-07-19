import { boolean, char, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const sourceType = pgEnum("source_type", [
  "press",
  "registry",
  "gazette",
  "court",
  "fund_site",
  "company_site",
  "association",
  "other",
]);

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  url: text("url"),
  country: char("country", { length: 2 }),
  sourceType: sourceType("source_type").notNull(),
  fetchMethod: text("fetch_method"),
  schedule: text("schedule"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status"),
  // Per-source crawl configuration (see @continuum/pipeline SourceConfig):
  //   maxItemsPerRun     number, default 10 — cap on new articles per run
  //   linkIncludePattern regex string articles must match (firecrawl_index only)
  //   articleFetch       'simple' | 'firecrawl', default 'simple'
  //   language           2-letter code stamped onto stored documents
  config: jsonb("config")
    .notNull()
    .default(sql`'{}'::jsonb`),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  url: text("url"),
  title: text("title"),
  language: char("language", { length: 2 }),
  docType: text("doc_type"),
  contentHash: text("content_hash"),
  // Raw fetched content lives in Postgres for now; blob storage (storage_ref)
  // arrives with PDFs in a later phase (R2-later — binaries are never stored,
  // only url + extracted text).
  contentText: text("content_text"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  storageRef: text("storage_ref"),
  // Registry listing metadata, raw strings verbatim from the source
  // (e.g. caseRef, debtorName, court) + extraction markers (needsOcr, extraction).
  meta: jsonb("meta")
    .notNull()
    .default(sql`'{}'::jsonb`),
});

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status"),
  stats: jsonb("stats"),
  error: text("error"),
});

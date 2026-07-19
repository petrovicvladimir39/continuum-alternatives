import { boolean, char, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").references(() => sources.id),
  url: text("url"),
  title: text("title"),
  language: char("language", { length: 2 }),
  docType: text("doc_type"),
  contentHash: text("content_hash"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  storageRef: text("storage_ref"),
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

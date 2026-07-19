import { date, index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { reviewStatus } from "./edges";
import { entities } from "./entities";
import { documents } from "./sources";

/**
 * APPEND-ONLY — application code never UPDATEs or DELETEs rows in timeline_facts.
 * Corrections are expressed as new facts; the record itself is immutable.
 */
export const timelineFacts = pgTable(
  "timeline_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    factType: text("fact_type").notNull(),
    occurredOn: date("occurred_on").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    title: text("title").notNull(),
    body: text("body"),
    audienceChannels: text("audience_channels")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourceDocumentId: uuid("source_document_id").references(() => documents.id),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).notNull().default("1.00"),
    status: reviewStatus("status").default("approved"),
    data: jsonb("data"),
  },
  (t) => [
    index("timeline_facts_entity_occurred_idx").on(t.entityId, t.occurredOn),
    index("timeline_facts_audience_channels_idx").using("gin", t.audienceChannels),
  ],
);

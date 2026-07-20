import { boolean, date, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timelineFacts } from "./timeline";

/**
 * Digest lifecycle: draft → approved → sent. Composition is deterministic
 * (no LLM; an optional LLM-written intro is BACKLOG). Digests are
 * operator-triggered — no cron auto-sending.
 */
export const digests = pgTable("digests", {
  id: uuid("id").primaryKey().defaultRandom(),
  digestDate: date("digest_date").unique().notNull(),
  status: text("status").default("draft"),
  subject: text("subject"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  // Delivery report (per-path outcome, per-send errors, skip reasons) so the
  // admin page can surface partial failures persistently.
  delivery: jsonb("delivery")
    .notNull()
    .default(sql`'{}'::jsonb`),
});

export const digestItems = pgTable("digest_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  digestId: uuid("digest_id")
    .notNull()
    .references(() => digests.id),
  factId: uuid("fact_id")
    .notNull()
    .references(() => timelineFacts.id),
  channel: text("channel").notNull(),
  rank: integer("rank").notNull(),
  included: boolean("included").default(true),
});

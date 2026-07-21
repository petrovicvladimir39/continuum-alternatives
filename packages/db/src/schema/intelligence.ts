import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { documents } from "./sources";
import { memberProfiles } from "./members";

/**
 * Intelligence toolkit (Phase 34) — chat-with-filing cache, ask-grounding
 * cache, deterministic daily usage counters, scout submissions, watchdog
 * briefs. LLM features here are grounded, guarded, capped; everything
 * that counts or limits is deterministic code reading these tables.
 */

/**
 * Chat-with-filing (34C): one row per (document, normalized question) —
 * cache hits are free and instant. Answers are SINGLE-document grounded;
 * cross-document synthesis is deliberately absent in v1 (RAG across a
 * corpus invites confident synthesis errors the guard model can't catch;
 * revisit only with per-quote provenance).
 */
export const docChats = pgTable(
  "doc_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    memberId: uuid("member_id").references(() => memberProfiles.id),
    questionNormalized: text("question_normalized").notNull(),
    /** {answer, quotes:[{verbatim, note}]} — post-guard survivors only. */
    answer: jsonb("answer").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("doc_chats_doc_question_idx").on(t.documentId, t.questionNormalized)],
);

/**
 * Ask-grounding cache (34D): normalized query → the Filters object the
 * model's forced tool call produced. The model NEVER emits prose to a
 * user — this table can only ever hold filter structures.
 */
export const askGroundings = pgTable("ask_groundings", {
  questionNormalized: text("question_normalized").primaryKey(),
  filters: jsonb("filters").notNull(),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * Deterministic per-member daily counters — one table for every Phase 34
 * cap: kind ∈ 'doc_chat' (free tier 3/day), 'ask_ground' (20/day),
 * 'scout' (5/day). Midnight UTC reset by keying on the date.
 */
export const memberDailyUsage = pgTable(
  "member_daily_usage",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    kind: text("kind").notNull(),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.kind, t.day] })],
);

/**
 * Scout submissions (34E): structured member-contributed signals through
 * the review queue (kind 'scout'). Approval INSERTS an approved fact
 * (timeline_facts stays append-only — no updates) plus a document row for
 * the required source URL, so the citation renders through the normal
 * spine. NO rewards/points/leaderboards v1 — incentives come after
 * volume exists, if ever, and never as gamification.
 */
export const scoutSubmissions = pgTable(
  "scout_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    factType: text("fact_type").notNull(),
    entityIds: uuid("entity_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    entitiesFree: text("entities_free"),
    occurredOn: date("occurred_on").notNull(),
    sourceUrl: text("source_url").notNull(),
    note: text("note"),
    /** Member's choice: credit line vs anonymous contribution. */
    anonymous: boolean("anonymous").notNull().default(false),
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
    publishedFactId: uuid("published_fact_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [index("scout_submissions_member_idx").on(t.memberId, t.createdAt)],
);

/**
 * Watchdog briefs (34E): one composed weekly brief per opted-in founding
 * member; unique per (member, week) so re-runs never double-compose.
 */
export const watchdogBriefs = pgTable(
  "watchdog_briefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    weekStart: date("week_start").notNull(),
    bodyMd: text("body_md").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("watchdog_briefs_member_week_idx").on(t.memberId, t.weekStart)],
);

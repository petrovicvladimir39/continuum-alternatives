import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { memberProfiles } from "./members";

/**
 * Member engagement (Phase 30) — reactions + entity-anchored signal threads.
 * Everything here is member-gated (sign-in) but NOT founding-gated:
 * participation wants breadth — a discussion only the paying hundred can
 * join is a ghost town, and member speech is the input the ranking and
 * prediction layers will later learn from. The paid line stays at bulk
 * data access and briefs, not at having a voice.
 */

/**
 * One reaction per member per item (pk), switchable. Aggregates are
 * STRUCTURED SENTIMENT — queryable per entity/channel/class as a ranking
 * input and, eventually, prediction-layer feature. They are NEVER rendered
 * publicly as scores or percentages: public UI shows raw small counts (≥3)
 * only, because a "72% credible" badge would manufacture false precision
 * from a handful of clicks.
 */
export const itemReactions = pgTable(
  "item_reactions",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    targetKind: text("target_kind").notNull(), // 'fact' | 'article'
    targetId: uuid("target_id").notNull(),
    reaction: text("reaction").notNull(), // 'credible' | 'doubtful' | 'watching'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.targetKind, t.targetId] }),
    index("item_reactions_target_idx").on(t.targetKind, t.targetId),
  ],
);

/**
 * Thread posts are ANCHORED, never free-floating: every post hangs off an
 * entity, an article, or (schema-ready, UI later) an event. Flat and
 * chronological — no nesting in v1; replies are a LATER decision, taken
 * only if flat threads prove insufficient, because nesting invites
 * argument trees where a professional record wants statements.
 *
 * status 'removed' keeps the row: the UI renders a "Removed by moderators"
 * stub so thread continuity survives moderation.
 */
export const threadPosts = pgTable(
  "thread_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anchorKind: text("anchor_kind").notNull(), // 'entity' | 'article' | 'event'
    anchorId: uuid("anchor_id").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    body: text("body").notNull(),
    status: text("status").notNull().default("published"), // 'published' | 'removed'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [index("thread_posts_anchor_idx").on(t.anchorKind, t.anchorId, t.createdAt)],
);

/** One report per member per post; reason optional (one-click). */
export const postReports = pgTable(
  "post_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => threadPosts.id),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("post_reports_post_member_idx").on(t.postId, t.memberId)],
);

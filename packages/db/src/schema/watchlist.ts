import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { entities } from "./entities";
import { memberProfiles } from "./members";

/**
 * Member watchlists + alerts (Phase 28A) — the daily-return engine.
 *
 * Everything here is MEMBER-FREE this phase. The paid line (next phase)
 * falls between watching/alerts (free, retention) and bulk data access /
 * exports / API (paid) — not through this table.
 */

export const memberWatchlist = pgTable(
  "member_watchlist",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.entityId] })],
);

export const memberAlertPrefs = pgTable("member_alert_prefs", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => memberProfiles.id),
  // 'daily' (one batched email) | 'instant_important' (important fact types
  // immediately, rest daily) | 'off'.
  frequency: text("frequency").notNull().default("daily"),
  lastDigestedAt: timestamp("last_digested_at", { withTimezone: true }),
  // Phase 34E — the weekly Watchdog brief (founding, OPT-IN on /account;
  // default off: nobody gets LLM-composed email they didn't ask for).
  watchdogOptIn: boolean("watchdog_opt_in").notNull().default(false),
});

/**
 * Alert outbox: one row per (member, kind, ref) — the unique index IS the
 * idempotency guarantee for event capture. sent_at null = pending (also the
 * graceful pre-Resend state); seen_at powers /account/updates.
 */
export const alertOutbox = pgTable(
  "alert_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    kind: text("kind").notNull(), // 'fact' | 'article' | 'edge' | 'view_hit'
    refId: uuid("ref_id").notNull(),
    entityId: uuid("entity_id").references(() => entities.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("alert_outbox_member_kind_ref_idx").on(t.memberId, t.kind, t.refId)],
);

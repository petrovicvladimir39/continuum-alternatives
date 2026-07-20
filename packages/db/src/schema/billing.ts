import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { memberProfiles } from "./members";

/**
 * Stripe founding tier (Phase 29A). One subscription row per member —
 * synced by the signature-verified /api/webhooks/stripe route and the
 * checkout success path. `status` mirrors Stripe verbatim; which statuses
 * grant entitlements is decided in ONE place:
 * @continuum/shared entitlements.ts (FOUNDING_ACTIVE_STATUSES).
 *
 * `founding` marks the launch tier ("locked for life"): future price tiers
 * insert rows with founding=false and their own price_id — the flag is how
 * early members keep their terms.
 */
export const memberSubscriptions = pgTable("member_subscriptions", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => memberProfiles.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("incomplete"),
  priceId: text("price_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  founding: boolean("founding").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Member CSV export log (Phase 29B) — the deterministic 10/day rate limit
 * for founding exports counts rows here; `params` records what was exported
 * (honesty + support), never row content.
 */
export const memberExportLog = pgTable(
  "member_export_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    kind: text("kind").notNull(), // 'entities' | 'view'
    params: jsonb("params"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("member_export_log_member_created_idx").on(t.memberId, t.createdAt)],
);

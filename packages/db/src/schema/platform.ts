import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { entities } from "./entities";
import { memberProfiles } from "./members";

/**
 * Platform stage (Phase 33): claiming, vendor tier, API keys, usage,
 * member webhooks.
 */

/**
 * Org claims (33A). One APPROVED claim per entity (partial unique index) —
 * the claimant becomes the org's steward. Steward powers are DELIBERATELY
 * narrow: an own-voice statement and SUGGESTIONS routed through the review
 * queue. Stewards never write record data directly — the record's
 * provenance discipline does not bend for the subject of the record.
 */
export const orgClaims = pgTable(
  "org_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    method: text("method").notNull(), // 'email_domain' | 'manual'
    evidence: text("evidence"),
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("org_claims_one_approved_idx")
      .on(t.entityId)
      .where(sql`status = 'approved'`),
    index("org_claims_entity_idx").on(t.entityId),
  ],
);

/**
 * Vendor tier (33B): one subscription per ORG (the steward pays for the
 * org's vendor profile). Status mirrors Stripe verbatim; which statuses
 * grant remains decided by FOUNDING_ACTIVE_STATUSES in @continuum/shared.
 */
export const vendorSubscriptions = pgTable("vendor_subscriptions", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  memberId: uuid("member_id")
    .notNull()
    .references(() => memberProfiles.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("incomplete"),
  priceId: text("price_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Track-record stories (33B).
 *
 * ══ CLIENT-CONSENT LAW ══════════════════════════════════════════════════
 * A referenced client is NAMED only after that client's own steward
 * explicitly granted it ('granted'). Unclaimed client → anonymized
 * automatically; declined → anonymized; pending → anonymized until
 * granted. On top of that sits the operator review gate — BOTH gates or
 * no named publication, ever.
 * ════════════════════════════════════════════════════════════════════════
 */
export const vendorStories = pgTable(
  "vendor_stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    createdByMemberId: uuid("created_by_member_id")
      .notNull()
      .references(() => memberProfiles.id),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    dealEntityId: uuid("deal_entity_id").references(() => entities.id),
    clientEntityId: uuid("client_entity_id").references(() => entities.id),
    // 'none_needed' (no client ref) | 'pending' | 'granted' | 'anonymized'
    clientConsent: text("client_consent").notNull().default("none_needed"),
    status: text("status").notNull().default("proposed"), // 'proposed' | 'published' | 'rejected'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("vendor_stories_entity_idx").on(t.entityId)],
);

/**
 * API keys (33C) — founding members only. The raw key is shown ONCE at
 * creation; only its sha256 hash is stored.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => memberProfiles.id),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("api_keys_hash_idx").on(t.keyHash)],
);

/** Daily usage rollups (33C/E) — admin telemetry + future metered pricing. */
export const apiUsage = pgTable(
  "api_usage",
  {
    keyId: uuid("key_id")
      .notNull()
      .references(() => apiKeys.id),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.keyId, t.day] })],
);

/**
 * Minute-window rate counters (33C). Postgres stands in until Upstash is
 * configured (Phase 33 note: swap the limiter in api-auth.ts for Upstash
 * REST when UPSTASH_REDIS_REST_URL lands — same interface, no schema use).
 * Old windows are deleted opportunistically on write.
 */
export const apiRateWindows = pgTable(
  "api_rate_windows",
  {
    keyId: uuid("key_id")
      .notNull()
      .references(() => apiKeys.id),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.keyId, t.windowStart] })],
);

/**
 * Member webhooks (33E) — founding-gated, https-only. Payloads carry
 * PUBLIC record data only (facts/articles/posts the member's watchlist
 * surfaced) — never private edges, never other members' data. Signed with
 * the per-hook secret (HMAC-SHA256); 10 consecutive failures deactivates
 * with an /account/updates notice.
 */
export const memberWebhooks = pgTable("member_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => memberProfiles.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  active: boolean("active").notNull().default(true),
  failureCount: integer("failure_count").notNull().default(0),
  /** Outbox rows created after this instant are still undelivered. */
  deliveredThrough: timestamp("delivered_through", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

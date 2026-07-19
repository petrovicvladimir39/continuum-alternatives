import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { entities } from "./entities";

/**
 * Audience channel vocabulary (values used in timeline_facts.audience_channels and
 * contacts.channels; canonical CHANNELS const lives in @continuum/shared):
 *   distressed, private_credit, vc_founders, pe, lp_institutional, vendors
 */

// Table exists from Phase 3; unused until a later phase.
export const signals = pgTable("signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  anchorEntityId: uuid("anchor_entity_id")
    .notNull()
    .references(() => entities.id),
  title: text("title").notNull(),
  status: text("status").default("dormant"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: text("role"),
  org: text("org"),
  channels: text("channels")
    .array()
    .default(sql`'{}'::text[]`),
  consentSource: text("consent_source"),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

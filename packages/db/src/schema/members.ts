import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Member identity foundation (Phase 24C). One row per Clerk user, synced by
 * the svix-verified webhook (user.created/user.deleted) with an on-demand
 * upsert fallback on the first authenticated /account visit.
 *
 * user.deleted soft-deletes (deleted_at) and NOTHING else — members own no
 * graph rows yet, so there is no cascade into entities/facts/edges, and
 * there never will be one from this table.
 */
export const memberProfiles = pgTable("member_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  displayName: text("display_name"),
  email: text("email"),
  // Phase 30B — real-name policy: posts display the member's display name
  // plus this OPTIONAL, member-set professional line ("Partner" · "Adria
  // Capital"). Set on /account; never inferred, never required.
  roleTitle: text("role_title"),
  organization: text("organization"),
  // Phase 30D — posting ban (moderation). NULL = not banned; a timestamp
  // blocks posting/reacting until it passes. Enforced server-side in the
  // community actions, surfaced only in /admin/moderation.
  bannedUntil: timestamp("banned_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

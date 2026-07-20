import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { memberProfiles } from "./members";

/**
 * Saved Ask-bar views (Phase 25D). filters jsonb mirrors AskFilters from
 * @continuum/shared (channels/countries/factTypes/freeText) plus the raw q
 * string for perfect URL restoration.
 *
 * Foundation for watchlist alerts (next phase): an alert is a saved view
 * plus a delivery schedule — this table stays the source of truth.
 */
export const memberSavedViews = pgTable("member_saved_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => memberProfiles.id),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(),
  // Phase 28: alert-enabled views are evaluated daily against new items
  // (view_hit outbox rows, capped 20/view/day).
  alertEnabled: boolean("alert_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

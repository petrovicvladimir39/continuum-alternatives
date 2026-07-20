import {
  char,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Geocode cache — one row per (country, normalized city), including cities
 * Nominatim could NOT resolve (lat/lng null): a cached null is a valid answer
 * and is never re-queried, keeping us polite against the free API.
 */
export const cityGeocodes = pgTable(
  "city_geocodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    country: char("country", { length: 2 }).notNull(),
    cityNormalized: text("city_normalized").notNull(),
    cityDisplay: text("city_display").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    source: text("source").default("nominatim"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("city_geocodes_country_city_idx").on(t.country, t.cityNormalized)],
);

import {
  doublePrecision,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { entities } from "./entities";

/**
 * LOGO-PIN MAP — address-level coordinates, one row per (entity, source).
 * Sources, in map preference order:
 *   website_hq        — HQ address scraped from the entity's own site
 *                        (enrichment pipeline); best signal for fund-shaped
 *                        entities whose registered seat is an admin building.
 *   register_address   — registered address from GLEIF / registers / gazettes.
 *   city_centroid      — from entities.geo / city_geocodes; precision 'city'.
 * precision: 'rooftop' (house-number hit) | 'street' (street/road hit) |
 * 'city' (centroid). location_confidence ∈ [0,1]; the SPV-collision pass
 * downgrades rooftops shared by many entities (fund-admin / law-firm / TCSP
 * buildings in LU/IE/CY/LI/MT and accountant hubs in CEE) — a registered
 * address is NOT necessarily a real office. raw_address is kept verbatim so
 * geocoding is re-runnable and auditable; we never fabricate a street.
 */
export const entityLocations = pgTable(
  "entity_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    source: text("source").notNull(), // register_address | website_hq | city_centroid
    rawAddress: text("raw_address"),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    precision: text("precision"), // rooftop | street | city
    locationConfidence: numeric("location_confidence"),
    geocodedAt: timestamp("geocoded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("entity_locations_entity_source_idx").on(t.entityId, t.source),
    index("entity_locations_latlon_idx").on(t.lat, t.lon),
  ],
);

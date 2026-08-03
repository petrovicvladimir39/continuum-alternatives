import "./env";
import { db, sql } from "@continuum/db";

/**
 * LOGO-PIN MAP S1 — seed entity_locations with city-centroid rows from the
 * existing entities.geo column (written by geocode:backfill over the years).
 * $0, one statement, idempotent: ON CONFLICT (entity_id, source) DO NOTHING.
 * precision='city', confidence 0.5 — honest baseline the street geocoder
 * upgrades from; we never fabricate a street address.
 */
async function main(): Promise<void> {
  const inserted = await db.execute(sql`
    INSERT INTO entity_locations
      (entity_id, source, lat, lon, precision, location_confidence, geocoded_at)
    SELECT e.id, 'city_centroid',
           ST_Y(e.geo::geometry), ST_X(e.geo::geometry),
           'city', 0.5, now()
    FROM entities e
    WHERE e.geo IS NOT NULL AND e.status = 'active'
    ON CONFLICT (entity_id, source) DO NOTHING
  `);
  const [total] = (
    await db.execute(sql`
      SELECT count(*)::int AS n,
             count(*) FILTER (WHERE source = 'city_centroid')::int AS centroids
      FROM entity_locations
    `)
  ).rows as { n: number; centroids: number }[];
  console.log(`inserted ${inserted.rowCount ?? 0} centroid rows`);
  console.log(`entity_locations total: ${total?.n} (centroids: ${total?.centroids})`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);

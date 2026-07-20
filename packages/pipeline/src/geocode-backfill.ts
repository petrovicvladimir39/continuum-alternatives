import "./env";
import { db, sql } from "@continuum/db";
import { normalizeAlias } from "@continuum/shared";
import { geocodeCity } from "./geocode";

/**
 * Stamps entities.geo (PostGIS point) for every active entity whose HQ city
 * resolves. City precedence: organizations.hq_city (curated universe rows),
 * else the most recent timeline fact's city — ALSU insolvency facts carry it
 * as data.city, asset-sale facts as data.place; we coalesce both.
 * Entities with a country but no resolvable city get NO geo — they are
 * excluded from map dots and surfaced as a count in the UI note instead
 * (honesty over jitter: we never invent a location).
 */

type EntityCity = {
  id: string;
  country: string | null;
  hqCity: string | null;
  factCity: string | null;
};

async function main() {
  const started = Date.now();
  const result = await db.execute(sql`
    select e.id, e.country, o.hq_city,
      (select coalesce(tf.data->>'city', tf.data->>'place')
         from timeline_facts tf
        where tf.entity_id = e.id
          and coalesce(tf.data->>'city', tf.data->>'place') is not null
        order by tf.occurred_on desc, tf.recorded_at desc
        limit 1) as fact_city
    from entities e
    left join organizations o on o.entity_id = e.id
    where e.status = 'active'
  `);
  const rows: EntityCity[] = result.rows.map((row) => ({
    id: String(row.id),
    country: row.country === null ? null : String(row.country),
    hqCity: row.hq_city === null || row.hq_city === undefined ? null : String(row.hq_city),
    factCity: row.fact_city === null || row.fact_city === undefined ? null : String(row.fact_city),
  }));

  // Distinct (country, city) pairs, remembering which entities each covers
  // and whether the city came from a curated hq or a registry fact.
  const pairs = new Map<
    string,
    { country: string; city: string; entityIds: string[]; fromHq: number; fromFact: number }
  >();
  let withoutLocation = 0;
  for (const row of rows) {
    const city = row.hqCity ?? row.factCity;
    if (row.country === null || city === null) {
      withoutLocation += 1;
      continue;
    }
    const key = `${row.country}:${normalizeAlias(city)}`;
    const entry = pairs.get(key) ?? {
      country: row.country,
      city,
      entityIds: [],
      fromHq: 0,
      fromFact: 0,
    };
    entry.entityIds.push(row.id);
    if (row.hqCity !== null) {
      entry.fromHq += 1;
    } else {
      entry.fromFact += 1;
    }
    pairs.set(key, entry);
  }

  console.log(`active entities: ${rows.length}, distinct (country, city) pairs: ${pairs.size}`);

  let cacheHits = 0;
  let apiCalls = 0;
  let geocodedEntities = 0;
  let geocodedFromHq = 0;
  let geocodedFromFact = 0;
  let unresolvedPairs = 0;

  for (const entry of pairs.values()) {
    let outcome;
    try {
      outcome = await geocodeCity(entry.country, entry.city);
    } catch (error) {
      console.error(`retryable: ${entry.country}/${entry.city}: ${String(error)}`);
      withoutLocation += entry.entityIds.length;
      continue;
    }
    if (outcome.cached) {
      cacheHits += 1;
    } else {
      apiCalls += 1;
    }
    if (outcome.lat === null || outcome.lng === null) {
      unresolvedPairs += 1;
      withoutLocation += entry.entityIds.length;
      console.log(`no-hit ${entry.country}/${entry.city} (${entry.entityIds.length} entities)`);
      continue;
    }
    for (const id of entry.entityIds) {
      await db.execute(sql`
        update entities
        set geo = ST_SetSRID(ST_MakePoint(${outcome.lng}, ${outcome.lat}), 4326)::geography
        where id = ${id}
      `);
    }
    geocodedEntities += entry.entityIds.length;
    geocodedFromHq += entry.fromHq;
    geocodedFromFact += entry.fromFact;
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\ngeocode-backfill report`);
  console.log(`  distinct cities:      ${pairs.size} (${unresolvedPairs} unresolved by Nominatim)`);
  console.log(`  cache hits:           ${cacheHits}`);
  console.log(`  API calls:            ${apiCalls}`);
  console.log(`  entities geocoded:    ${geocodedEntities}`);
  console.log(`    via curated hq_city: ${geocodedFromHq}`);
  console.log(`    via registry fact:   ${geocodedFromFact}`);
  console.log(`  without location:     ${withoutLocation}`);
  console.log(`  elapsed:              ${elapsed}s`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

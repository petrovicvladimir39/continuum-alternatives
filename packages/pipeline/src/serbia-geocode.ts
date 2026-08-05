import "./env";
import { db, sql } from "@continuum/db";

/**
 * SERBIA DEEP RUN — geocode REGISTERED addresses ($0, Nominatim).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-geocode.ts [--limit N]
 *
 * WHY THIS EXISTS: rooftop coverage was stuck at ~115 because the only
 * geocoding pass ran over addresses scraped from company WEBSITES (a few
 * hundred). The register itself gives us 4,000+ street addresses via
 * kompanije.co.rs and those were never geocoded. Benchmarked on real Serbian
 * addresses, Nominatim returns house-number precision for ~80% of them — the
 * geocoder was never the bottleneck, the missing pass was.
 *
 * Method:
 *  - STRUCTURED query first (street/city/country), free-text as fallback;
 *    both were measured equally accurate, structured is less ambiguous.
 *  - Addresses are CACHED by normalized key: Serbian companies share
 *    buildings constantly, so one request can locate many entities.
 *  - Precision recorded honestly from the response: house_number → rooftop,
 *    road → street, otherwise city. Nothing is upgraded or invented.
 *  - 1.1s between requests, per Nominatim's usage policy.
 *
 * Written to entity_locations source='register_address' so it never
 * overwrites a website-derived HQ location.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";
const RATE_MS = 1100;

type Hit = { lat: number; lon: number; precision: "rooftop" | "street" | "city" };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Serbian registers publish ALL-CAPS; title-case reads better to the geocoder
 *  and to humans, and fixes transliteration artefacts like "PROKUPLjE". */
function tidy(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    .replace(/\s+/g, " ");
}

async function query(url: string): Promise<Hit | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as {
      lat: string;
      lon: string;
      address?: Record<string, string>;
    }[];
    const hit = json[0];
    if (hit === undefined) {
      return null;
    }
    const ad = hit.address ?? {};
    const precision =
      ad.house_number !== undefined ? "rooftop" : ad.road !== undefined ? "street" : "city";
    return { lat: Number.parseFloat(hit.lat), lon: Number.parseFloat(hit.lon), precision };
  } catch {
    return null;
  }
}

async function geocode(street: string, city: string): Promise<Hit | null> {
  const st = tidy(street);
  const ct = tidy(city);
  const structured =
    `${NOMINATIM}?street=${encodeURIComponent(st)}&city=${encodeURIComponent(ct)}` +
    `&country=Serbia&format=json&limit=1&addressdetails=1`;
  const first = await query(structured);
  if (first !== null && first.precision !== "city") {
    return first;
  }
  await sleep(RATE_MS);
  const free = `${NOMINATIM}?q=${encodeURIComponent(`${st}, ${ct}, Serbia`)}&format=json&limit=1&addressdetails=1`;
  const second = await query(free);
  // Keep whichever is more precise; a city-level hit is still better than none.
  if (second === null) {
    return first;
  }
  if (first === null) {
    return second;
  }
  const rank = { rooftop: 3, street: 2, city: 1 } as const;
  return rank[second.precision] > rank[first.precision] ? second : first;
}

async function main(): Promise<void> {
  const limIdx = process.argv.indexOf("--limit");
  const limit = limIdx >= 0 ? Number.parseInt(process.argv[limIdx + 1] ?? "0", 10) : 0;

  const rows = (
    await db.execute(sql`
      SELECT o.entity_id,
             o.registered_address->>'street' AS street,
             coalesce(o.registered_address->>'city', o.hq_city, '') AS city
      FROM organizations o
      JOIN entities e ON e.id = o.entity_id
      WHERE e.country = 'RS'
        AND o.registered_address->>'street' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM entity_locations el
          WHERE el.entity_id = o.entity_id
            AND el.precision IN ('rooftop','street')
        )
      ORDER BY
        EXISTS (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = 'rs_sector_target') DESC,
        (o.category_fields->>'revenue_rsd')::numeric DESC NULLS LAST
      ${limit > 0 ? sql`LIMIT ${limit}` : sql``}
    `)
  ).rows as { entity_id: string; street: string; city: string }[];

  console.log(`serbia-geocode: ${rows.length} registered addresses without precise coordinates`);

  // Shared buildings are the norm here — cache by address so one lookup can
  // place many companies.
  const cache = new Map<string, Hit | null>();
  const counts = { rooftop: 0, street: 0, city: 0, none: 0, cached: 0 };
  let n = 0;

  for (const row of rows) {
    const key = `${tidy(row.street)}|${tidy(row.city)}`;
    let hit: Hit | null;
    if (cache.has(key)) {
      hit = cache.get(key) ?? null;
      counts.cached += 1;
    } else {
      hit = await geocode(row.street, row.city);
      cache.set(key, hit);
      await sleep(RATE_MS);
    }
    n += 1;

    if (hit === null) {
      counts.none += 1;
    } else {
      counts[hit.precision] += 1;
      await db.execute(sql`
        INSERT INTO entity_locations
          (entity_id, source, raw_address, lat, lon, precision, location_confidence, geocoded_at)
        VALUES (${row.entity_id}::uuid, 'register_address',
                ${`${row.street}, ${row.city}`}, ${hit.lat}, ${hit.lon}, ${hit.precision},
                ${hit.precision === "rooftop" ? "0.9" : hit.precision === "street" ? "0.7" : "0.4"}, now())
        ON CONFLICT (entity_id, source) DO UPDATE SET
          raw_address = EXCLUDED.raw_address, lat = EXCLUDED.lat, lon = EXCLUDED.lon,
          precision = EXCLUDED.precision, location_confidence = EXCLUDED.location_confidence,
          geocoded_at = now()`);
    }

    if (n % 50 === 0) {
      console.log(
        `  ${n}/${rows.length} · rooftop ${counts.rooftop} · street ${counts.street} · city ${counts.city} · none ${counts.none} · cache hits ${counts.cached}`,
      );
    }
  }

  console.log(
    `\nserbia-geocode done: ${n} processed\n` +
      `  rooftop ${counts.rooftop} · street ${counts.street} · city ${counts.city} · unresolved ${counts.none}\n` +
      `  ${counts.cached} served from the address cache (${cache.size} unique addresses looked up)`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

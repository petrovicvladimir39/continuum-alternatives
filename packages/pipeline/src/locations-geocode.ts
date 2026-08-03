import "./env";
import { db, sql } from "@continuum/db";
import { USER_AGENT } from "./crawl-shared";

/**
 * LOGO-PIN MAP S1 — street-level geocoder over entity_locations rows that
 * hold a raw_address but no coordinates yet.
 *
 * Provider probe result: Nominatim (house pattern, no key, 1 rps) — Geoapify
 * free tier needs an API key and Pelias needs self-hosting, so Nominatim
 * wins on $0 + existing politeness infra.
 *
 * - Identical raw addresses are deduped BEFORE the API (fund-admin / TCSP
 *   buildings in LU/LI/MT collapse hundreds of SPVs into one call).
 * - precision from the hit type: house number → rooftop (0.9), road-level →
 *   street (0.7). A miss falls back to the entity's own city centroid with
 *   precision='city' (0.4) — NEVER a fabricated street.
 * - Resumable by construction (lat IS NULL AND geocoded_at IS NULL filter);
 *   --limit bounds the number of API calls per run.
 * - Ends with the SPV-collision pass: any rooftop shared by >5 entities is
 *   downgraded to confidence 0.2 (registered address ≠ real office).
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CONTACT_EMAIL = "hello@continuumalternatives.com";
const DELAY_MS = 1_100;
const TIMEOUT_MS = 15_000;
const COLLISION_THRESHOLD = 5;

let lastApiCall = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type NominatimHit = {
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  addresstype?: string;
  address?: { house_number?: string; road?: string };
};

type Located = {
  lat: number;
  lon: number;
  precision: "rooftop" | "street";
  confidence: number;
};

async function geocodeAddress(raw: string): Promise<Located | null> {
  const wait = lastApiCall + DELAY_MS - Date.now();
  if (wait > 0) {
    await sleep(wait);
  }
  lastApiCall = Date.now();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", raw);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": `${USER_AGENT} contact:${CONTACT_EMAIL}` },
  });
  if (!response.ok) {
    // Transient — throw so the run stops and the row stays retryable.
    throw new Error(`Nominatim HTTP ${response.status} for "${raw.slice(0, 60)}"`);
  }
  const hits = (await response.json()) as NominatimHit[];
  const hit = hits[0];
  if (hit?.lat === undefined || hit.lon === undefined) {
    return null;
  }
  const lat = Number.parseFloat(hit.lat);
  const lon = Number.parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const rooftop =
    hit.address?.house_number !== undefined ||
    hit.class === "building" ||
    hit.addresstype === "building";
  const streetLevel =
    rooftop || hit.class === "highway" || hit.addresstype === "road" || hit.type === "residential";
  if (!streetLevel) {
    // City/region-level match — not a street answer; treat as miss so the
    // centroid fallback (precision='city') applies instead.
    return null;
  }
  return rooftop
    ? { lat, lon, precision: "rooftop", confidence: 0.9 }
    : { lat, lon, precision: "street", confidence: 0.7 };
}

async function main(): Promise<void> {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg >= 0 ? Number.parseInt(process.argv[limitArg + 1] ?? "", 10) : NaN;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("--limit <api-calls> is required (each unique address = 1 call)");
  }

  const rows = (
    await db.execute(sql`
      SELECT l.id, l.entity_id, l.raw_address
      FROM entity_locations l
      WHERE l.source IN ('register_address', 'website_hq')
        AND l.lat IS NULL AND l.geocoded_at IS NULL AND l.raw_address IS NOT NULL
      ORDER BY l.raw_address
    `)
  ).rows as { id: string; entity_id: string; raw_address: string }[];

  // Dedupe identical addresses — one API call locates every SPV in the
  // building. Normalization is deliberately light (case + whitespace).
  const groups = new Map<string, { raw: string; rowIds: string[]; entityIds: string[] }>();
  for (const row of rows) {
    const key = row.raw_address.toLowerCase().replace(/\s+/g, " ").trim();
    const group = groups.get(key) ?? { raw: row.raw_address, rowIds: [], entityIds: [] };
    group.rowIds.push(row.id);
    group.entityIds.push(row.entity_id);
    groups.set(key, group);
  }
  console.log(`${rows.length} rows pending across ${groups.size} unique addresses`);

  let calls = 0;
  let rooftop = 0;
  let street = 0;
  let cityFallback = 0;
  let unresolved = 0;

  for (const group of groups.values()) {
    if (calls >= limit) {
      break;
    }
    calls += 1;
    const located = await geocodeAddress(group.raw);
    if (located !== null) {
      if (located.precision === "rooftop") {
        rooftop += group.rowIds.length;
      } else {
        street += group.rowIds.length;
      }
      await db.execute(sql`
        UPDATE entity_locations
        SET lat = ${located.lat}, lon = ${located.lon},
            precision = ${located.precision},
            location_confidence = ${located.confidence},
            geocoded_at = now()
        WHERE id = ANY(${group.rowIds}::uuid[])
      `);
    } else {
      // Definitive miss → per-entity city-centroid fallback, never invented.
      const result = await db.execute(sql`
        UPDATE entity_locations l
        SET lat = c.lat, lon = c.lon, precision = 'city',
            location_confidence = 0.4, geocoded_at = now()
        FROM entity_locations c
        WHERE l.id = ANY(${group.rowIds}::uuid[])
          AND c.entity_id = l.entity_id AND c.source = 'city_centroid'
          AND c.lat IS NOT NULL
      `);
      const fell = result.rowCount ?? 0;
      cityFallback += fell;
      unresolved += group.rowIds.length - fell;
      // Stamp the leftovers so they are not retried every run.
      await db.execute(sql`
        UPDATE entity_locations
        SET geocoded_at = now()
        WHERE id = ANY(${group.rowIds}::uuid[]) AND geocoded_at IS NULL
      `);
    }
    if (calls % 25 === 0) {
      process.stdout.write(`\r${calls}/${Math.min(limit, groups.size)} addresses`);
    }
  }

  // SPV-collision pass: shared rooftops are admin buildings, not offices.
  const collisions = await db.execute(sql`
    WITH hot AS (
      SELECT round(lat::numeric, 5) AS rlat, round(lon::numeric, 5) AS rlon
      FROM entity_locations
      WHERE source = 'register_address' AND precision IN ('rooftop', 'street')
      GROUP BY 1, 2
      HAVING count(*) > ${COLLISION_THRESHOLD}
    )
    UPDATE entity_locations l
    SET location_confidence = 0.2
    FROM hot
    WHERE round(l.lat::numeric, 5) = hot.rlat AND round(l.lon::numeric, 5) = hot.rlon
      AND l.source = 'register_address' AND l.precision IN ('rooftop', 'street')
      AND l.location_confidence::numeric > 0.2
  `);

  console.log(`\napi calls: ${calls}`);
  console.log(`rows located — rooftop: ${rooftop}, street: ${street}, city-fallback: ${cityFallback}, unresolved: ${unresolved}`);
  console.log(`collision downgrades this run: ${collisions.rowCount ?? 0}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);

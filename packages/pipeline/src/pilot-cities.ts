import "./env";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { db, sql } from "@continuum/db";
import { twoLetterMonogram } from "@continuum/shared";
import { USER_AGENT } from "./crawl-shared";
import { mapClassSlug } from "./map-icons";

/**
 * GLOBE→CITY EXPERIENCE — LOGO-DENSE pilot dataset (2026-08-04 rebuild).
 * Real register-verified corpus entities only, LOGO-BEARING FIRST. A city
 * SURVIVES only if it can field ≥${MIN_LOGOS} logo entities; its selection
 * is capped at 2× its logo count so coverage never drops below ~50% —
 * better 6–8 cities that look like the Stockholm map than 19 of gravel.
 * Dropped cities are reported honestly, never monogram-padded. Monograms
 * appear only as rare filler, in a DARKER receding card style.
 *
 * Outputs (all static, the map reads no Postgres):
 *   tiles/pilot.geojson        — pin features (icon, name, cls, sort, prec…)
 *   sprites/pilot-atlas.png    — 64px rounded-square cards (deck.gl iconAtlas)
 *   sprites/pilot-mapping.json — deck.gl iconMapping
 *   tiles/pilot-report.json    — per-city coverage incl. dropped cities
 *   tiles/country-stats.json   — full-corpus counts per country (choropleth)
 */

const SPRITES_DIR = path.join(process.cwd(), "..", "..", "apps", "web", "public", "map", "sprites");
const TILES_DIR = path.join(process.cwd(), "..", "..", "apps", "web", "public", "map", "tiles");
const TILE = 64;
const COLS = 16;
const TARGET_PER_CITY = 30;
/** A city survives only with this many logo-bearing entities nearby. */
const MIN_LOGOS = 8;
const RADIUS_KM = 28;
const FETCH_TIMEOUT_MS = 10_000;

/** CEE/SEE first per the coverage mandate, then west. */
const PILOT_CITIES: { city: string; country: string; lat: number; lng: number }[] = [
  { city: "Warsaw", country: "PL", lat: 52.2297, lng: 21.0122 },
  { city: "Prague", country: "CZ", lat: 50.0755, lng: 14.4378 },
  { city: "Budapest", country: "HU", lat: 47.4979, lng: 19.0402 },
  { city: "Bucharest", country: "RO", lat: 44.4268, lng: 26.1025 },
  { city: "Belgrade", country: "RS", lat: 44.7866, lng: 20.4489 },
  { city: "Zagreb", country: "HR", lat: 45.815, lng: 15.9819 },
  { city: "Sofia", country: "BG", lat: 42.6977, lng: 23.3219 },
  { city: "Vilnius", country: "LT", lat: 54.6872, lng: 25.2797 },
  { city: "Bratislava", country: "SK", lat: 48.1486, lng: 17.1077 },
  { city: "Ljubljana", country: "SI", lat: 46.0569, lng: 14.5058 },
  { city: "Vienna", country: "AT", lat: 48.2082, lng: 16.3738 },
  { city: "Frankfurt", country: "DE", lat: 50.1109, lng: 8.6821 },
  { city: "Luxembourg", country: "LU", lat: 49.6116, lng: 6.1319 },
  { city: "Amsterdam", country: "NL", lat: 52.3676, lng: 4.9041 },
  { city: "Paris", country: "FR", lat: 48.8566, lng: 2.3522 },
  { city: "London", country: "GB", lat: 51.5074, lng: -0.1278 },
  { city: "Milan", country: "IT", lat: 45.4642, lng: 9.19 },
  { city: "Madrid", country: "ES", lat: 40.4168, lng: -3.7038 },
  { city: "Stockholm", country: "SE", lat: 59.3293, lng: 18.0686 },
];

/** Light-ground v2 class accents (:root --v2-ac-*) for monogram text. */
const LIGHT_HEX: Record<string, string> = {
  "private-equity": "#157a63",
  "private-credit": "#96690f",
  "real-assets": "#6d6414",
  "hedge-funds": "#5b3684",
  structured: "#106a6e",
  esoteric: "#772f6b",
  collectibles: "#7d3450",
  climate: "#3c7d33",
  digital: "#3f4178",
  neutral: "#57544e",
};

type CorpusRow = {
  entity_id: string;
  slug: string;
  name: string;
  lat: number;
  lon: number;
  precision: string;
  country: string;
  kind: string;
  website: string | null;
  logo_url: string | null;
  class_slug: string | null;
  has_registry: boolean;
  degree: number;
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function cardSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">
  <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" rx="10" fill="#ffffff" stroke="rgba(20,19,17,0.22)" stroke-width="1"/>
  ${inner}
</svg>`;
}

/** Dark receding card — rare filler that must NOT compete with logo cards. */
function monogramCard(monogram: string, classSlug: string): string {
  const hex = LIGHT_HEX[classSlug] ?? LIGHT_HEX.neutral!;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">
  <rect x="0.5" y="0.5" width="${TILE - 1}" height="${TILE - 1}" rx="10" fill="#1f1f1e" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Instrument Sans, Arial, sans-serif" font-size="22" font-weight="500" fill="${hex}" opacity="0.75">${monogram}</text>
</svg>`;
}

async function logoCard(logoUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(logoUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT },
    });
    if (!response.ok) {
      return null;
    }
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length === 0) {
      return null;
    }
    const inner = await sharp(input, { animated: false })
      .resize(44, 44, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    return await sharp(Buffer.from(cardSvg("")))
      .composite([{ input: inner, left: 10, top: 10 }])
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const countries = [...new Set(PILOT_CITIES.map((c) => c.country))];
  const rows = (
    await db.execute(sql`
      SELECT DISTINCT ON (e.id)
        e.id AS entity_id, e.slug, e.name, l.lat, l.lon, l.precision,
        e.country, e.kind::text AS kind, o.website, o.logo_url,
        (SELECT c.asset_class FROM entity_classifications c
          WHERE c.entity_id = e.id AND c.status = 'approved'
          ORDER BY c.confidence DESC LIMIT 1) AS class_slug,
        (o.registry_id IS NOT NULL) AS has_registry,
        COALESCE((SELECT count(*) FROM edges ed
          WHERE ed.source_entity_id = e.id OR ed.target_entity_id = e.id), 0)::int AS degree
      FROM entities e
      JOIN entity_locations l ON l.entity_id = e.id AND l.lat IS NOT NULL
      LEFT JOIN organizations o ON o.entity_id = e.id
      WHERE e.status = 'active' AND e.country = ANY(${`{${countries.join(",")}}`}::text[])
      ORDER BY e.id,
        CASE l.source WHEN 'website_hq' THEN 0 WHEN 'register_address' THEN 1 ELSE 2 END,
        CASE l.precision WHEN 'rooftop' THEN 0 WHEN 'street' THEN 1 ELSE 2 END
    `)
  ).rows as CorpusRow[];
  console.log(`corpus candidates in pilot countries: ${rows.length}`);

  type Selected = CorpusRow & { pilotCity: string };

  const report: Record<string, Record<string, number | boolean>> = {};
  const selected: Selected[] = [];
  const survivors: string[] = [];

  // Pass 1 — coverage census, printed BEFORE building anything.
  console.log("── logo-coverage census (city · nearby · logos · verdict) ──");
  for (const pilot of PILOT_CITIES) {
    const near = rows.filter(
      (r) =>
        r.country === pilot.country &&
        haversineKm(pilot.lat, pilot.lng, r.lat, r.lon) <= RADIUS_KM,
    );
    const logos = near.filter((r) => r.logo_url !== null).length;
    const survives = logos >= MIN_LOGOS;
    console.log(
      `${pilot.city.padEnd(12)} ${String(near.length).padStart(5)} ${String(logos).padStart(4)}  ${survives ? "KEEP" : "drop (<" + MIN_LOGOS + " logos)"}`,
    );
    report[pilot.city] = {
      corpusLocatedNearby: near.length,
      withLogo: logos,
      survives,
      selectedReal: 0,
      logoCards: 0,
      monogramCards: 0,
      rooftop: 0,
      street: 0,
      cityCentroid: 0,
    };
    if (!survives) {
      continue;
    }
    survivors.push(pilot.city);

    // Pass 2 — LOGO-FIRST selection, capped at 2× logo count so monograms
    // stay rare filler (coverage ≥ 50% by construction).
    const rank = (r: CorpusRow): number =>
      (r.logo_url !== null ? 100_000 : 0) +
      (r.website !== null ? 10_000 : 0) +
      (r.precision === "rooftop" ? 1_000 : r.precision === "street" ? 500 : 0) +
      r.degree;
    near.sort((a, b) => rank(b) - rank(a));
    const cap = Math.min(TARGET_PER_CITY, logos * 2);
    const take = near.slice(0, cap);
    for (const r of take) {
      selected.push({ ...r, pilotCity: pilot.city });
    }
    const cityReport = report[pilot.city]!;
    cityReport.selectedReal = take.length;
    cityReport.logoCards = take.filter((r) => r.logo_url !== null).length;
    cityReport.monogramCards = take.filter((r) => r.logo_url === null).length;
    cityReport.rooftop = take.filter((r) => r.precision === "rooftop").length;
    cityReport.street = take.filter((r) => r.precision === "street").length;
    cityReport.cityCentroid = take.filter((r) => r.precision === "city").length;
  }
  console.log(`survivors: ${survivors.join(", ")}`);

  // ── icons: one deck.gl atlas of rounded white cards ──
  const icons: { name: string; png: Buffer }[] = [];
  let logosOk = 0;
  let logosFailed = 0;
  for (const s of selected) {
    let png: Buffer | null = null;
    if (s.logo_url !== null) {
      png = await logoCard(s.logo_url);
      if (png !== null) {
        logosOk += 1;
      } else {
        logosFailed += 1;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (png === null) {
      png = await sharp(
        Buffer.from(monogramCard(twoLetterMonogram(s.name), mapClassSlug(s.class_slug))),
      )
        .png()
        .toBuffer();
    }
    icons.push({ name: `p-${s.slug}`, png });
  }
  const atlasRows = Math.ceil(icons.length / COLS);
  const mapping: Record<string, { x: number; y: number; width: number; height: number }> = {};
  const composites = icons.map((icon, i) => {
    mapping[icon.name] = {
      x: (i % COLS) * TILE,
      y: Math.floor(i / COLS) * TILE,
      width: TILE,
      height: TILE,
    };
    return { input: icon.png, left: (i % COLS) * TILE, top: Math.floor(i / COLS) * TILE };
  });
  fs.mkdirSync(SPRITES_DIR, { recursive: true });
  fs.mkdirSync(TILES_DIR, { recursive: true });
  await sharp({
    create: {
      width: COLS * TILE,
      height: atlasRows * TILE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(SPRITES_DIR, "pilot-atlas.png"));
  fs.writeFileSync(path.join(SPRITES_DIR, "pilot-mapping.json"), JSON.stringify(mapping));

  // ── pilot.geojson — real corpus entities only, logo cards sort first ──
  const features = selected.map((s) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
    properties: {
      icon: `p-${s.slug}`,
      name: s.name,
      slug: s.slug,
      cls: mapClassSlug(s.class_slug),
      country: s.country,
      tier: s.has_registry ? "register" : "monitored",
      kind: s.kind,
      city: s.pilotCity,
      aumM: null as number | null,
      sort: -(
        (s.logo_url !== null ? 5_000 : 0) +
        (s.website !== null ? 2_000 : 0) +
        s.degree * 50
      ),
      prec: s.precision,
      mock: false,
    },
  }));
  fs.writeFileSync(
    path.join(TILES_DIR, "pilot.geojson"),
    JSON.stringify({ type: "FeatureCollection", features }),
  );

  // ── country stats (full corpus) for the choropleth ──
  const stats = (
    await db.execute(sql`
      SELECT e.country, count(DISTINCT e.id)::int AS located,
        (SELECT string_agg(cls, '|') FROM (
          SELECT c.asset_class AS cls
          FROM entity_classifications c
          JOIN entities e2 ON e2.id = c.entity_id
          WHERE e2.country = e.country AND c.status = 'approved'
          GROUP BY c.asset_class ORDER BY count(*) DESC LIMIT 2
        ) top) AS top_classes
      FROM entities e
      JOIN entity_locations l ON l.entity_id = e.id AND l.lat IS NOT NULL
      WHERE e.status = 'active' AND e.country IS NOT NULL
      GROUP BY e.country
    `)
  ).rows as { country: string; located: number; top_classes: string | null }[];
  const countryStats = Object.fromEntries(
    stats.map((s) => [s.country, { count: s.located, topClasses: s.top_classes?.split("|") ?? [] }]),
  );
  fs.writeFileSync(path.join(TILES_DIR, "country-stats.json"), JSON.stringify(countryStats));

  fs.writeFileSync(
    path.join(TILES_DIR, "pilot-report.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals: {
          real: selected.length,
          survivingCities: survivors.length,
          droppedCities: PILOT_CITIES.length - survivors.length,
          logosFetched: logosOk,
          logoFailures: logosFailed,
          atlasIcons: icons.length,
        },
        cities: report,
      },
      null,
      2,
    ),
  );

  console.log(`\nselected ${selected.length} real entities across ${survivors.length} surviving cities (${PILOT_CITIES.length - survivors.length} dropped)`);
  console.log(`logo cards fetched: ${logosOk} (failed→monogram: ${logosFailed})`);
  console.log(`atlas: ${COLS * TILE}×${atlasRows * TILE}px, ${icons.length} icons`);
  for (const city of survivors) {
    const r = report[city]!;
    const pct = Number(r.selectedReal) > 0 ? Math.round((100 * Number(r.logoCards)) / Number(r.selectedReal)) : 0;
    console.log(
      `${city.padEnd(12)} selected ${String(r.selectedReal).padStart(2)} · logo cards ${String(r.logoCards).padStart(2)} (${pct}%) · monograms ${r.monogramCards}`,
    );
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);

import { and, cityGeocodes, db, eq } from "@continuum/db";
import { normalizeAlias } from "@continuum/shared";
import { USER_AGENT } from "./crawl-shared";

/**
 * Nominatim geocoder — free, so we are strictly polite: a HARD 1.1s delay
 * between API calls (their limit is 1 rps), ContinuumBot UA with a contact
 * email, and cache-first semantics: a (country, city) pair is queried at most
 * once EVER, including pairs Nominatim could not resolve (cached nulls are
 * answers, not misses). Transient failures (HTTP/network errors) are NOT
 * cached, so the next run retries them.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CONTACT_EMAIL = "hello@continuumalternatives.com";
const DELAY_MS = 1_100;
const TIMEOUT_MS = 15_000;

let lastApiCall = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Municipality alias pass (Phase 17), applied BEFORE the cache lookup:
 * 1. Strip " – {municipality}" / " - {municipality}" suffixes ("Београд –
 *    Стари Град" → "Београд") — registry city strings often carry them.
 * 2. Map known Belgrade municipality names to Beograd, so debtor rows filed
 *    under a municipality land on the same city dot as the capital.
 * Keys are normalizeAlias forms (transliterated, lowercased). Exported pure
 * for verification.
 */
const BELGRADE_MUNICIPALITIES = new Set([
  "stari grad",
  "novi beograd",
  "zemun",
  "vracar",
  "palilula",
  "savski venac",
  "zvezdara",
  "vozdovac",
  "cukarica",
  "rakovica",
  "grocka",
  "lazarevac",
  "mladenovac",
  "obrenovac",
  "sopot",
  "surcin",
  "barajevo",
]);

export function normalizeCityName(cityDisplay: string): string {
  // En dash, em dash, or spaced hyphen all separate city from municipality.
  const stripped = cityDisplay.split(/\s+[–—-]\s+/)[0]?.trim() ?? cityDisplay.trim();
  const key = normalizeAlias(stripped);
  if (key === "beograd" || BELGRADE_MUNICIPALITIES.has(key)) {
    return "Београд";
  }
  return stripped;
}

export type GeocodeOutcome = {
  lat: number | null;
  lng: number | null;
  cached: boolean;
};

export async function geocodeCity(country: string, cityDisplay: string): Promise<GeocodeOutcome> {
  const normalizedCity = country === "RS" ? normalizeCityName(cityDisplay) : cityDisplay.trim();
  const key = normalizeAlias(normalizedCity);
  const hit = (
    await db
      .select()
      .from(cityGeocodes)
      .where(and(eq(cityGeocodes.country, country), eq(cityGeocodes.cityNormalized, key)))
  )[0];
  if (hit !== undefined) {
    return { lat: hit.lat, lng: hit.lng, cached: true };
  }

  const wait = lastApiCall + DELAY_MS - Date.now();
  if (wait > 0) {
    await sleep(wait);
  }
  lastApiCall = Date.now();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("city", normalizedCity);
  url.searchParams.set("country", country);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": `${USER_AGENT} contact:${CONTACT_EMAIL}` },
  });
  if (!response.ok) {
    // Do not cache transient failures — only definitive empty results.
    throw new Error(`Nominatim HTTP ${response.status} for ${country}/${cityDisplay}`);
  }
  const results = (await response.json()) as { lat?: string; lon?: string }[];
  const first = results[0];
  const lat = first?.lat !== undefined ? Number.parseFloat(first.lat) : null;
  const lng = first?.lon !== undefined ? Number.parseFloat(first.lon) : null;
  const resolved = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

  await db.insert(cityGeocodes).values({
    country,
    cityNormalized: key,
    cityDisplay: normalizedCity,
    lat: resolved ? lat : null,
    lng: resolved ? lng : null,
  });
  return { lat: resolved ? lat : null, lng: resolved ? lng : null, cached: false };
}

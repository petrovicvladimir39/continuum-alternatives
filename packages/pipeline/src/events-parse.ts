/**
 * Event parsing (Phase 31A) — PURE functions, fixture-tested in
 * verify-events. Tolerant by design: a card that doesn't parse is skipped
 * and reported, never guessed at.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type DateRange = { startsOn: string; endsOn: string };

/**
 * "29-30 September 2026" · "24 November 2026" · "23-24 Sep, 2026" ·
 * "7 Sep, 2026" · "30 September - 2 October 2026" → ISO range, null if
 * nothing parses cleanly.
 */
export function parseEventDateRange(raw: string): DateRange | null {
  const text = raw
    .replace(/&nbsp;|&bull;|•/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Cross-month: "30 September - 2 October 2026"
  let match = /^(\d{1,2})\s+([A-Za-z]+)\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text);
  if (match !== null) {
    const [, d1, m1, d2, m2, year] = match;
    const month1 = MONTHS[m1!.toLowerCase()];
    const month2 = MONTHS[m2!.toLowerCase()];
    if (month1 !== undefined && month2 !== undefined) {
      return {
        startsOn: iso(Number(year), month1, Number(d1)),
        endsOn: iso(Number(year), month2, Number(d2)),
      };
    }
  }
  // Same-month range: "29-30 September 2026"
  match = /^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text);
  if (match !== null) {
    const [, d1, d2, monthName, year] = match;
    const month = MONTHS[monthName!.toLowerCase()];
    if (month !== undefined) {
      return {
        startsOn: iso(Number(year), month, Number(d1)),
        endsOn: iso(Number(year), month, Number(d2)),
      };
    }
  }
  // Single day: "24 November 2026"
  match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text);
  if (match !== null) {
    const [, day, monthName, year] = match;
    const month = MONTHS[monthName!.toLowerCase()];
    if (month !== undefined) {
      const date = iso(Number(year), month, Number(day));
      return { startsOn: date, endsOn: date };
    }
  }
  return null;
}

/** European country NAMES → ISO-2 (harvest listings state names, not codes). */
export const COUNTRY_NAME_CODES: Record<string, string> = {
  "united kingdom": "GB", uk: "GB", england: "GB", scotland: "GB",
  germany: "DE", france: "FR", spain: "ES", italy: "IT", netherlands: "NL",
  belgium: "BE", austria: "AT", switzerland: "CH", poland: "PL", czechia: "CZ",
  "czech republic": "CZ", romania: "RO", greece: "GR", portugal: "PT",
  ireland: "IE", hungary: "HU", croatia: "HR", serbia: "RS", bulgaria: "BG",
  slovenia: "SI", slovakia: "SK", denmark: "DK", sweden: "SE", norway: "NO",
  finland: "FI", estonia: "EE", latvia: "LV", lithuania: "LT", luxembourg: "LU",
  cyprus: "CY", malta: "MT", iceland: "IS", ukraine: "UA", monaco: "MC",
};

/** Cities the NPL-circuit sites use → country codes (tolerant, extend as seen). */
export const CITY_COUNTRY_CODES: Record<string, string> = {
  london: "GB", madrid: "ES", frankfurt: "DE", berlin: "DE", munich: "DE",
  vienna: "AT", warsaw: "PL", prague: "CZ", budapest: "HU", bucharest: "RO",
  athens: "GR", milan: "IT", rome: "IT", lisbon: "PT", paris: "FR",
  amsterdam: "NL", dublin: "IE", zagreb: "HR", belgrade: "RS", sofia: "BG",
  geneva: "CH", zurich: "CH", cannes: "FR", helsinki: "FI", stockholm: "SE",
  copenhagen: "DK", brussels: "BE", luxembourg: "LU", barcelona: "ES",
};

export type ParsedEventCard = {
  name: string;
  startsOn: string;
  endsOn: string;
  city: string | null;
  country: string | null;
  format: "in_person" | "online" | "hybrid";
  url: string;
};

export type HarvestParseResult = { cards: ParsedEventCard[]; skipped: string[] };

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .trim();
}

/**
 * SmithNovak homepage cards: <div class="gtitle">NPL Global</div> …
 * <div class="gdate">London • 29-30 September 2026</div> … href to the
 * conference page. Past editions parse too — the caller filters by date.
 */
export function parseSmithNovak(html: string): HarvestParseResult {
  const cards: ParsedEventCard[] = [];
  const skipped: string[] = [];
  const cardRe =
    /<div class="gtitle">([^<]+)<\/div>[\s\S]{0,400}?<div class="gdate">([^<]+)<\/div>[\s\S]{0,200}?href="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = cardRe.exec(html)) !== null) {
    const name = decodeEntities(match[1]!);
    const dateBlob = decodeEntities(match[2]!).replace(/&bull;|•/g, "•");
    const href = match[3]!;
    // "London • 29-30 September 2026" — city before the bullet.
    const parts = dateBlob.split(/[•]/).map((part) => part.trim()).filter((part) => part !== "");
    const city = parts.length > 1 ? parts[0]! : null;
    const range = parseEventDateRange(parts[parts.length - 1] ?? "");
    if (range === null) {
      skipped.push(`${name}: unparseable date "${dateBlob}"`);
      continue;
    }
    const url = href.startsWith("http") ? href : `https://www.smithnovak.com${href}`;
    cards.push({
      name,
      startsOn: range.startsOn,
      endsOn: range.endsOn,
      city,
      country: city !== null ? (CITY_COUNTRY_CODES[city.toLowerCase()] ?? null) : null,
      format: "in_person",
      url,
    });
  }
  return { cards, skipped };
}

/**
 * TMA Europe /events cards: event-card__date, __location (country name or
 * "Online"), __title, then the event link. Non-European locations are
 * skipped — this is a European calendar.
 */
export function parseTmaEurope(html: string): HarvestParseResult {
  const cards: ParsedEventCard[] = [];
  const skipped: string[] = [];
  const chunks = html.split(/event-card__date">/).slice(1);
  for (const chunk of chunks) {
    const date = decodeEntities(chunk.slice(0, chunk.indexOf("<")));
    const locationMatch = /event-card__location"[^>]*>([^<]+)</.exec(chunk);
    const titleMatch = /event-card__title">([^<]+)</.exec(chunk);
    const hrefMatch = /href="(https:\/\/www\.tma-europe\.org\/events\/[^"?][^"]*)"/.exec(chunk);
    if (titleMatch === null || hrefMatch === null) {
      continue; // pagination/rss links, not cards
    }
    const name = decodeEntities(titleMatch[1]!);
    const range = parseEventDateRange(date);
    if (range === null) {
      skipped.push(`${name}: unparseable date "${date}"`);
      continue;
    }
    const location = locationMatch === null ? "" : decodeEntities(locationMatch[1]!);
    const online = location.toLowerCase() === "online";
    const country = online ? null : (COUNTRY_NAME_CODES[location.toLowerCase()] ?? null);
    if (!online && country === null) {
      skipped.push(`${name}: non-European or unknown location "${location}"`);
      continue;
    }
    cards.push({
      name,
      startsOn: range.startsOn,
      endsOn: range.endsOn,
      city: null, // listing states country only
      country,
      format: online ? "online" : "in_person",
      url: hrefMatch[1]!,
    });
  }
  return { cards, skipped };
}

import type { EventImportRow } from "@continuum/db";

/** CSV columns, in order — the import CLI enforces this header exactly. */
export const EVENTS_CSV_HEADER = [
  "name", "starts_on", "ends_on", "city", "country", "format", "venue", "url", "classes", "expected",
] as const;

const CSV_FORMATS = new Set(["in_person", "online", "hybrid"]);

/** One CSV row → import shape (pure; deeper validation lives in importEvent). */
export function rowToImport(cells: string[]): EventImportRow | { error: string } {
  const [name, startsOn, endsOn, city, country, format, venue, url, classes, expected] =
    EVENTS_CSV_HEADER.map((_, index) => (cells[index] ?? "").trim());
  if (!CSV_FORMATS.has(format ?? "")) {
    return { error: `format must be in_person|online|hybrid (${name})` };
  }
  return {
    name: name!,
    startsOn: startsOn!,
    endsOn: endsOn === "" ? null : endsOn!,
    city: city === "" ? null : city!,
    country: country === "" ? null : country!.toUpperCase(),
    format: format as EventImportRow["format"],
    venue: venue === "" ? null : venue!,
    url: url!,
    classes: (classes ?? "").split(";").map((slug) => slug.trim()).filter((slug) => slug !== ""),
    expected: (expected ?? "").toLowerCase() === "true",
  };
}

/** CSV reading moved to @continuum/shared (Phase 32A) — one implementation. */
export { parseCsv } from "@continuum/shared";

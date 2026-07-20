/**
 * Site IA + homepage/report pure helpers (Phase 19). Kept in shared so the
 * header/footer/homepage/report components and the verify suite consume ONE
 * definition. All functions are deterministic (injected `now` where needed).
 */

import { NAV_TREE, navLeaves } from "./nav";

// Phase 25A: the primary nav became a tree (see nav.ts). The footer keeps a
// flat platform column derived from the same tree.
export const FOOTER_PLATFORM_LINKS = navLeaves(NAV_TREE);

/**
 * "Today in Alternatives" strip (Phase 25D) — one deterministic sentence
 * from live counts. Null (hidden) when the day is empty. Never an LLM.
 */
export function composeTodayStrip(input: {
  weekday: string;
  newSignals: number;
  countries: number;
  auctionsClosingThisWeek: number;
  fundUpdates: number;
}): string | null {
  const parts: string[] = [];
  if (input.newSignals > 0) {
    parts.push(
      `${input.newSignals} new signal${input.newSignals === 1 ? "" : "s"}` +
        (input.countries > 1 ? ` across ${input.countries} countries` : ""),
    );
  }
  if (input.auctionsClosingThisWeek > 0) {
    parts.push(
      `${input.auctionsClosingThisWeek} auction${input.auctionsClosingThisWeek === 1 ? "" : "s"} closing this week`,
    );
  }
  if (input.fundUpdates > 0) {
    parts.push(`${input.fundUpdates} fund update${input.fundUpdates === 1 ? "" : "s"}`);
  }
  if (parts.length === 0) {
    return null;
  }
  return `${input.weekday}: ${parts.join(" · ")}`;
}

/**
 * Anti-skew rail diversity (reset build Part 7): order-preserving cap of
 * 2 items per country, plus — once a rail is 5+ long — no single country
 * above 40% of it. Items with unknown country always pass. Deferred items
 * refill the tail when caps allow, so rails stay dense without one market
 * drowning the front page.
 */
export function diversifyRail<T>(
  items: T[],
  limit: number,
  countryOf: (item: T) => string | null,
): T[] {
  const kept: T[] = [];
  const deferred: T[] = [];
  const counts = new Map<string, number>();
  const allows = (country: string | null, railLength: number): boolean => {
    if (country === null || country === "") {
      return true;
    }
    const current = counts.get(country) ?? 0;
    if (current >= 2) {
      return false;
    }
    const nextLength = railLength + 1;
    if (nextLength >= 5 && current + 1 > Math.floor(0.4 * nextLength)) {
      return false;
    }
    return true;
  };
  const take = (item: T) => {
    kept.push(item);
    const country = countryOf(item);
    if (country !== null && country !== "") {
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  };
  for (const item of items) {
    if (kept.length >= limit) {
      break;
    }
    if (allows(countryOf(item), kept.length)) {
      take(item);
    } else {
      deferred.push(item);
    }
  }
  for (const item of deferred) {
    if (kept.length >= limit) {
      break;
    }
    if (allows(countryOf(item), kept.length)) {
      take(item);
    }
  }
  return kept;
}

/**
 * Lead rotation (reset build Part 7): today's lead should not repeat
 * yesterday's lead country when an alternative exists. Given candidates in
 * recency order and the previous lead's country, returns the index to lead
 * with — the first candidate from a different country, else 0.
 */
export function pickRotatedLead<T>(
  candidates: T[],
  previousLeadCountry: string | null,
  countryOf: (item: T) => string | null,
): number {
  if (candidates.length === 0) {
    return 0;
  }
  const firstCountry = countryOf(candidates[0]!);
  if (
    previousLeadCountry === null ||
    firstCountry === null ||
    firstCountry !== previousLeadCountry
  ) {
    return 0;
  }
  for (let i = 1; i < candidates.length; i++) {
    const country = countryOf(candidates[i]!);
    if (country !== null && country !== previousLeadCountry) {
      return i;
    }
  }
  return 0;
}

/**
 * Sitemap chunk planning (Phase 23B). Chunk 0 = core (static pages, news,
 * digests, reports); entity kinds follow in stable order, ≤ chunkSize URLs
 * per chunk. Pure — verified with 10k+ fixtures.
 */
export type SitemapChunk = {
  id: number;
  kind: "core" | "organization" | "fund_vehicle" | "deal";
  offset: number;
};

export function sitemapChunkPlan(
  counts: { organization: number; fund_vehicle: number; deal: number },
  chunkSize = 1000,
): SitemapChunk[] {
  const plan: SitemapChunk[] = [{ id: 0, kind: "core", offset: 0 }];
  let id = 1;
  for (const kind of ["organization", "fund_vehicle", "deal"] as const) {
    const total = Math.max(0, counts[kind]);
    for (let offset = 0; offset < total; offset += chunkSize) {
      plan.push({ id, kind, offset });
      id += 1;
    }
  }
  return plan;
}

/** Bloomberg-rail "2h ago" prefixes, deterministic from an injected now. */
export function timeAgo(recordedAt: string | Date, now: string | Date): string {
  const then = typeof recordedAt === "string" ? Date.parse(recordedAt) : recordedAt.getTime();
  const current = typeof now === "string" ? Date.parse(now) : now.getTime();
  const minutes = Math.max(0, Math.floor((current - then) / 60_000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export type HomeSectionInput = {
  lead: boolean;
  latestCount: number;
  channelColumnCounts: number[];
  auctionsCount: number;
  hasDigest: boolean;
};

/**
 * Section population rules — ZERO empty states on the homepage: a section
 * renders only when it has content. Exported pure for verification.
 */
export function visibleHomeSections(input: HomeSectionInput): string[] {
  const sections: string[] = ["stat-strip"]; // stats always exist (live counts)
  if (input.lead) {
    sections.push("lead");
  }
  if (input.latestCount > 0) {
    sections.push("latest");
  }
  if (input.channelColumnCounts.some((count) => count > 0)) {
    sections.push("channel-band");
  }
  if (input.auctionsCount > 0) {
    sections.push("auctions-rail");
  }
  sections.push("bottom-band"); // map teaser stats always exist
  return sections;
}

export type ReportGateInput = {
  name: string;
  email: string;
  role: string;
  consent: boolean;
};

/** GDPR gate validation — consent is mandatory, not pre-ticked, not implied. */
export function validateReportGate(
  input: ReportGateInput,
): { ok: true } | { ok: false; error: string } {
  if (input.name.trim().length < 2) {
    return { ok: false, error: "Please enter your name." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim())) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (input.role.trim() === "") {
    return { ok: false, error: "Please select your role." };
  }
  if (!input.consent) {
    return { ok: false, error: "Consent is required to receive the report." };
  }
  return { ok: true };
}

/**
 * Generated typographic report cover — deterministic SVG from the title alone:
 * background alternates accent/ink by a stable title hash; serif title lines,
 * date line, small wordmark. NO images, NO gradients, NO shadows.
 */
export function reportCoverSvg(input: { title: string; date: string }): string {
  let hash = 0;
  for (const char of input.title) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const background = hash % 2 === 0 ? "#17456B" : "#141311";
  const words = input.title.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > 18) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line.trim() !== "") {
    lines.push(line.trim());
  }
  const titleSpans = lines
    .slice(0, 5)
    .map(
      (text, index) =>
        `<text x="28" y="${96 + index * 34}" font-family="Newsreader, Georgia, serif" font-size="27" font-weight="500" fill="#FFFFFF">${text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</text>`,
    )
    .join("");
  return [
    `<svg viewBox="0 0 320 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${input.title.replace(/"/g, "'")}">`,
    `<rect width="320" height="420" fill="${background}"/>`,
    `<rect x="0.5" y="0.5" width="319" height="419" fill="none" stroke="#FFFFFF" stroke-opacity="0.25"/>`,
    titleSpans,
    `<text x="28" y="368" font-family="Instrument Sans, sans-serif" font-size="13" fill="#FFFFFF" fill-opacity="0.75">${input.date}</text>`,
    `<text x="28" y="392" font-family="Instrument Sans, sans-serif" font-size="12" font-weight="500" fill="#FFFFFF">Continuum <tspan fill-opacity="0.7" font-weight="400">Alternatives</tspan></text>`,
    `</svg>`,
  ].join("");
}

/**
 * Site IA + homepage/report pure helpers (Phase 19). Kept in shared so the
 * header/footer/homepage/report components and the verify suite consume ONE
 * definition. All functions are deterministic (injected `now` where needed).
 */

export const NAV_ITEMS = [
  { href: "/feed", label: "News" },
  { href: "/map", label: "Map" },
  { href: "/auctions", label: "Auctions" },
  { href: "/rankings", label: "Rankings" },
  { href: "/reports", label: "Reports" },
  { href: "/digest", label: "Digest" },
] as const;

export const FOOTER_PLATFORM_LINKS = [
  ...NAV_ITEMS,
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
] as const;

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

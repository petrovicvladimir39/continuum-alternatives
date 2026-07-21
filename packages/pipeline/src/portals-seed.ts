import "./env";
import { db, eq, sources } from "@continuum/db";
import { FETCH_TIMEOUT_MS, USER_AGENT } from "./crawl-shared";

/**
 * Industry-portal seeding (reset build Part 4b) — $0, probe-first.
 *
 *   pnpm portals:seed
 *
 * Candidate list probed 2026-07-20 (matrix in the run report below). Each
 * candidate is re-probed live at seed time; only sources whose route answers
 * are created, always INACTIVE (activation is an operator decision with the
 * cost hint in /admin/sources). Paywalled/blocked portals are documented
 * and skipped:
 * - Les Echos (FR): public RSS discontinued; capital-investissement coverage
 *   sits behind the hard-paywalled Capital Finance product + Datadome bot
 *   wall. Documented dead end; CFNEWS (cfnews.net) is the natural French
 *   substitute if the operator wants one later (not in the candidate list).
 * - Article-level paywalls (Sifted Pro, Il Sole, Handelsblatt): feeds are
 *   open, headlines/teasers usable — seeded; extraction works from feed
 *   content, never from paywalled bodies.
 */

type PortalCandidate = {
  name: string;
  country: string | null;
  language: string;
  feedUrl?: string;
  indexUrl?: string;
  linkIncludePattern?: string;
  note: string;
};

const CANDIDATES: PortalCandidate[] = [
  { name: "Private Equity Wire", country: "GB", language: "en", feedUrl: "https://www.privateequitywire.co.uk/feed/", note: "rss-ready" },
  { name: "AltAssets", country: "GB", language: "en", feedUrl: "https://www.altassets.net/feed", note: "rss-ready; some bodies need free registration" },
  { name: "Sifted", country: "GB", language: "en", feedUrl: "https://sifted.eu/feed", note: "rss-ready; subset of articles behind Sifted Pro" },
  { name: "Tech.eu", country: null, language: "en", feedUrl: "https://tech.eu/feed/", note: "rss-ready" },
  { name: "EU-Startups", country: "ES", language: "en", feedUrl: "https://www.eu-startups.com/feed/", note: "WAF 403 from datacenter IPs — probe from operator machine decides" },
  { name: "Vestbee", country: "PL", language: "en", indexUrl: "https://www.vestbee.com/blog", linkIncludePattern: "/insights/articles/[a-z0-9-]+", note: "no feed; server-rendered index" },
  { name: "The Recursive", country: "BG", language: "en", feedUrl: "https://therecursive.com/feed/", note: "rss-ready; strong CEE coverage" },
  { name: "ArcticStartup", country: "FI", language: "en", feedUrl: "https://arcticstartup.com/feed/", note: "WAF 403 from datacenter IPs — probe from operator machine decides" },
  { name: "Finance Forward", country: "DE", language: "de", feedUrl: "https://financefwd.com/feed/", note: "rss-ready; low cadence" },
  { name: "Il Sole 24 Ore — Finanza", country: "IT", language: "it", feedUrl: "https://www.ilsole24ore.com/rss/finanza.xml", note: "rss-ready; article-level paywall (headlines usable)" },
  { name: "Handelsblatt — Finanzen", country: "DE", language: "de", feedUrl: "https://feeds.cms.handelsblatt.com/finanzen", note: "rss-ready; article-level paywall (headlines usable)" },
  // Les Echos: documented dead end — no seedable route (see header comment).
  // clean-100 Part 5 probes (2026-07-21): Real Deals, Unquote, PE News,
  // Science|Business, Invest Europe and Mergermarket expose no free feeds
  // (404/401 on all standard feed paths) — documented, not seeded. Preqin
  // is permanently prohibited (proprietary/ToS) regardless of blog access.
  { name: "Private Debt Investor", country: "GB", language: "en", feedUrl: "https://www.privatedebtinvestor.com/feed/", note: "rss-ready; article-level paywall (headlines usable)" },
  { name: "Global Legal Chronicle", country: null, language: "en", feedUrl: "https://globallegalchronicle.com/feed/", note: "rss-ready; deal/mandate coverage with law-firm detail" },
];

async function probeFeed(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*" },
    });
    if (!response.ok) {
      return false;
    }
    const text = (await response.text()).slice(0, 4000).toLowerCase();
    return text.includes("<rss") || text.includes("<feed") || text.includes("<rdf");
  } catch {
    return false;
  }
}

async function probeHtml(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
    });
    return response.ok && (await response.text()).length > 2000;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const matrix: string[] = [];
  let seeded = 0;
  let skippedExisting = 0;
  let failed = 0;

  for (const candidate of CANDIDATES) {
    const url = candidate.feedUrl ?? candidate.indexUrl!;
    const existing = await db.select({ id: sources.id }).from(sources).where(eq(sources.url, url));
    if (existing.length > 0) {
      skippedExisting += 1;
      matrix.push(`= ${candidate.name} — already seeded`);
      continue;
    }
    const ok = candidate.feedUrl !== undefined ? await probeFeed(url) : await probeHtml(url);
    if (!ok) {
      failed += 1;
      matrix.push(`✗ ${candidate.name} — probe failed (${candidate.note}) — documented, skipped`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    await db.insert(sources).values({
      name: candidate.name,
      url,
      country: candidate.country,
      sourceType: "press",
      fetchMethod: candidate.feedUrl !== undefined ? "rss" : "firecrawl_index",
      schedule: "daily",
      active: false,
      config: {
        maxItemsPerRun: 5,
        language: candidate.language,
        ...(candidate.linkIncludePattern !== undefined
          ? { linkIncludePattern: candidate.linkIncludePattern }
          : {}),
      },
    });
    seeded += 1;
    matrix.push(
      `✓ ${candidate.name} [${candidate.country ?? "—"}/${candidate.language}] — ${candidate.feedUrl !== undefined ? "rss" : "index"} — ${candidate.note}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("=== portal matrix ===");
  for (const line of matrix) {
    console.log(line);
  }
  console.log("✗ Les Echos [FR] — paywalled + bot-walled, public RSS discontinued — documented, skipped");
  console.log(`\nportals:seed done — seeded ${seeded} INACTIVE, existing ${skippedExisting}, failed ${failed}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

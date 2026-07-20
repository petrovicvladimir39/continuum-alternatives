import "./env";
import { db, sources, sql } from "@continuum/db";
import { FETCH_TIMEOUT_MS, USER_AGENT } from "./crawl-shared";
import { discoverFeedUrls, escapeRegex } from "./discover";

/**
 * Firm-newsroom discovery (reset build Part 4a) — $0, no LLM, no Firecrawl
 * spend (creation only; INACTIVE sources cost nothing until the operator
 * activates them).
 *
 *   pnpm sources:discover -- --limit 500
 *
 * For the most-connected active organizations with websites: probe the
 * homepage for RSS autodiscovery (<link rel="alternate">) and the common
 * newsroom paths (/news /press /press-releases /media /insights /newsroom).
 * Found → create an INACTIVE source "{Org} newsroom" linked via
 * sources.entity_id: fetch method 'rss' when a feed exists, else
 * 'firecrawl_index' with a same-domain linkIncludePattern, maxItemsPerRun 5.
 * 1s politeness between requests; orgs that already have a linked source
 * are skipped (idempotent re-runs).
 */

const NEWSROOM_PATHS = ["/news", "/press", "/press-releases", "/media", "/insights", "/newsroom"];
const POLITENESS_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probe(url: string): Promise<{ ok: boolean; html: string; finalUrl: string }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,*/*" },
    });
    if (!response.ok) {
      return { ok: false, html: "", finalUrl: url };
    }
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("html") && !type.includes("xml")) {
      return { ok: false, html: "", finalUrl: url };
    }
    const html = await response.text();
    return { ok: html.length > 1500, html, finalUrl: response.url || url };
  } catch {
    return { ok: false, html: "", finalUrl: url };
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let limit = 500;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = Number.parseInt(argv[++i]!, 10);
    }
  }

  // Most-connected active orgs with websites, skipping orgs that already
  // have a linked source. Degree counts edges in either direction, any
  // review status — connectivity is a prioritization signal, not a claim.
  const candidates = await db.execute(sql`
    SELECT e.id AS entity_id, e.name, e.country, o.website,
           (SELECT count(*) FROM edges x
             WHERE x.source_entity_id = e.id OR x.target_entity_id = e.id) AS degree
    FROM entities e
    JOIN organizations o ON o.entity_id = e.id
    WHERE e.kind = 'organization' AND e.status = 'active'
      AND o.website IS NOT NULL AND o.website <> ''
      AND NOT EXISTS (SELECT 1 FROM sources s WHERE s.entity_id = e.id)
    ORDER BY degree DESC, e.name ASC
    LIMIT ${limit}
  `);

  console.log(`sources:discover — probing ${candidates.rows.length} organizations`);
  let rssFound = 0;
  let indexFound = 0;
  let nothing = 0;
  const byCountry = new Map<string, number>();

  for (const raw of candidates.rows) {
    const entityId = String(raw.entity_id);
    const name = String(raw.name);
    const country = raw.country === null ? null : String(raw.country);
    const website = String(raw.website);

    let base: URL;
    try {
      base = new URL(website);
    } catch {
      nothing += 1;
      continue;
    }

    const home = await probe(base.href);
    await sleep(POLITENESS_MS);

    let feedUrl: string | null = null;
    if (home.ok) {
      const feeds = discoverFeedUrls(home.html, home.finalUrl);
      feedUrl = feeds[0] ?? null;
    }

    let indexUrl: string | null = null;
    if (feedUrl === null) {
      for (const path of NEWSROOM_PATHS) {
        const target = new URL(path, base).href;
        const page = await probe(target);
        await sleep(POLITENESS_MS);
        if (!page.ok) {
          continue;
        }
        // Stay on the org's own domain (redirects to socials don't count).
        let landed: URL;
        try {
          landed = new URL(page.finalUrl);
        } catch {
          continue;
        }
        if (!landed.hostname.replace(/^www\./, "").endsWith(base.hostname.replace(/^www\./, ""))) {
          continue;
        }
        // A newsroom page may itself advertise a feed — prefer that.
        const feeds = discoverFeedUrls(page.html, page.finalUrl);
        if (feeds[0] !== undefined) {
          feedUrl = feeds[0];
        } else {
          indexUrl = page.finalUrl;
        }
        break;
      }
    }

    if (feedUrl === null && indexUrl === null) {
      nothing += 1;
      continue;
    }

    const domainPattern = `^https?://([a-z0-9-]+\\.)*${escapeRegex(
      base.hostname.replace(/^www\./, ""),
    )}/`;
    await db.insert(sources).values({
      name: `${name} newsroom`,
      url: feedUrl ?? indexUrl!,
      country,
      sourceType: "company_site",
      fetchMethod: feedUrl !== null ? "rss" : "firecrawl_index",
      schedule: "daily",
      active: false,
      entityId,
      config: {
        maxItemsPerRun: 5,
        ...(feedUrl === null ? { linkIncludePattern: domainPattern } : {}),
      },
    });
    if (feedUrl !== null) {
      rssFound += 1;
    } else {
      indexFound += 1;
    }
    if (country !== null) {
      byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
    }
    console.log(`  + ${name} — ${feedUrl !== null ? `rss ${feedUrl}` : `index ${indexUrl}`}`);
  }

  console.log("\n=== sources:discover report ===");
  console.log(`probed ${candidates.rows.length} orgs — rss ${rssFound}, firecrawl_index ${indexFound}, nothing ${nothing}`);
  console.log("country spread of created sources:");
  for (const [country, count] of [...byCountry.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${country}: ${count}`);
  }
  console.log("all created sources are INACTIVE — activate in /admin/sources (cost hint shown).");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

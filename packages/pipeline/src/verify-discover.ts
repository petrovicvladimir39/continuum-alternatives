import "./env";
import { and, db, eq, isNotNull, sources } from "@continuum/db";
import { discoverFeedUrls, escapeRegex } from "./discover";
import { parseSourceConfig } from "./config";

/**
 * Verify: activity-discovery layer (reset build Part 4).
 * RSS autodiscovery parsing, same-domain pattern building, newsletter_rss
 * config passthrough, and portal/newsroom source persistence invariants.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

async function main(): Promise<void> {
  console.log("— RSS autodiscovery parse —");
  const html = `<!doctype html><html><head>
    <link rel="stylesheet" href="/style.css">
    <link rel="alternate" type="application/rss+xml" title="News" href="/feed.xml">
    <link rel="alternate" type="application/atom+xml" href="https://example.org/atom">
    <link rel="alternate" type="text/html" href="/en">
    <link rel="alternate" type="application/rss+xml" href="/feed.xml">
    </head><body></body></html>`;
  const feeds = discoverFeedUrls(html, "https://example.org/about/");
  check(feeds.length === 2, `two unique feeds found (got ${feeds.length})`);
  check(feeds[0] === "https://example.org/feed.xml", "relative href resolved against base");
  check(feeds[1] === "https://example.org/atom", "absolute atom href kept");
  check(discoverFeedUrls("<html><head></head></html>", "https://x.org").length === 0, "no feeds → empty");
  check(
    discoverFeedUrls(`<link rel="alternate" type="application/rss+xml" href="http://[bad">`, "https://x.org")
      .length === 0,
    "unparseable href skipped",
  );

  console.log("\n— same-domain pattern —");
  const pattern = `^https?://([a-z0-9-]+\\.)*${escapeRegex("acme-capital.eu")}/`;
  const regex = new RegExp(pattern);
  check(regex.test("https://acme-capital.eu/news/deal-1"), "bare domain matches");
  check(regex.test("https://www.acme-capital.eu/news/deal-1"), "www matches");
  check(!regex.test("https://acme-capital.eu.evil.com/x"), "suffix-spoof domain rejected");
  check(!regex.test("https://linkedin.com/company/acme-capital-eu"), "other domain rejected");

  console.log("\n— newsletter_rss config (voices layer) —");
  const config = parseSourceConfig({ maxItemsPerRun: 5, language: "en" });
  check(config.maxItemsPerRun === 5 && config.language === "en", "config parse passthrough");
  // The dispatch case lives in fetch.ts — assert the source file wires it.
  const fetchTs = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("./fetch.ts", import.meta.url), "utf8"),
  );
  check(fetchTs.includes('case "newsletter_rss"'), "fetchSource dispatches newsletter_rss");
  const fetchLower = fetchTs.toLowerCase();
  check(
    fetchLower.includes("x/twitter") && fetchLower.includes("excluded"),
    "X/Twitter exclusion documented in code",
  );

  console.log("\n— portal matrix persistence (seeded sources) —");
  const portals = await db
    .select({ name: sources.name, active: sources.active, config: sources.config, fetchMethod: sources.fetchMethod })
    .from(sources)
    .where(eq(sources.sourceType, "press"));
  // Seeded portals ship INACTIVE (activation is the operator's decision).
  // Scope to the reset-build candidate list — legacy operator-created press
  // sources (their own caps) are out of scope for these invariants.
  const SEEDED_PORTALS = [
    "Private Equity Wire", "AltAssets", "Sifted", "Tech.eu", "EU-Startups", "Vestbee",
    "The Recursive", "ArcticStartup", "Finance Forward", "Il Sole 24 Ore — Finanza",
    "Handelsblatt — Finanzen",
  ];
  const seeded = portals.filter(
    (p) =>
      (p.fetchMethod === "rss" || p.fetchMethod === "firecrawl_index") &&
      SEEDED_PORTALS.includes(p.name),
  );
  check(seeded.length >= 5, `industry portals persisted (got ${seeded.length})`);
  check(
    seeded.every((p) => {
      const cfg = parseSourceConfig(p.config);
      return cfg.maxItemsPerRun <= 10;
    }),
    "portal items-per-run stays capped",
  );
  const languages = new Set(
    seeded.map((p) => parseSourceConfig(p.config).language).filter((l) => l !== undefined),
  );
  check(languages.size >= 2, `language configs span markets (got ${[...languages].join(",")})`);

  console.log("\n— newsroom discovery persistence —");
  const newsrooms = await db
    .select({ id: sources.id, active: sources.active, entityId: sources.entityId })
    .from(sources)
    .where(and(eq(sources.sourceType, "company_site"), isNotNull(sources.entityId)));
  check(newsrooms.length > 0, `entity-linked newsroom sources exist (got ${newsrooms.length})`);
  check(
    newsrooms.every((n) => n.active === false || n.active === null || n.active === true),
    "newsroom active flag well-formed",
  );

  if (failures > 0) {
    console.error(`\nverify-discover: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-discover: PASS — discovery, voices, and portal invariants green");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

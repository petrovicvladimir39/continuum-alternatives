import "./env";
import { importEvent } from "@continuum/db";
import { parseSmithNovak, parseTmaEurope, type HarvestParseResult } from "./events-parse";

/**
 * Conference-calendar harvest (Phase 31A):
 *
 *   pnpm events:harvest [--site smithnovak|tma]
 *
 * Probe verdicts (2026-07-20, all HTTP 200):
 * - SmithNovak      → PARSER (server-rendered gtitle/gdate cards)  ✓ built
 * - TMA Europe      → PARSER (event-card__date/location/title)     ✓ built
 * - 0100 Conferences → JS app shell (~1.1MB), no stable listing markup — skip
 * - IPEM             → single-event marketing site, JS-heavy — skip
 * - SuperReturn      → Informa app shell (~1.4MB), no listing markup — skip
 * - Invest Europe    → listing largely member-gated — skip
 *
 * Everything lands PROPOSED (provisional entities) — the review queue is
 * the only path to the public calendar. Past editions are skipped here;
 * only future/ongoing events are worth proposing.
 */

const SITES: Record<
  string,
  { url: string; parse: (html: string) => HarvestParseResult; classes: string[] }
> = {
  // NPL / credit conference circuit → private_credit (class level).
  smithnovak: {
    url: "https://www.smithnovak.com/",
    parse: parseSmithNovak,
    classes: ["private_credit"],
  },
  // Turnaround / distressed circuit → private_credit (class level).
  tma: {
    url: "https://www.tma-europe.org/events/",
    parse: parseTmaEurope,
    classes: ["private_credit"],
  },
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2).filter((arg) => arg !== "--");
  const siteFlag = argv.indexOf("--site");
  const picked = siteFlag !== -1 ? argv[siteFlag + 1] : undefined;
  const sites = picked !== undefined ? { [picked]: SITES[picked] } : SITES;
  const today = new Date().toISOString().slice(0, 10);

  for (const [name, site] of Object.entries(sites)) {
    if (site === undefined) {
      console.error(`unknown site "${picked}" — options: ${Object.keys(SITES).join(", ")}`);
      process.exit(1);
    }
    console.log(`\n=== ${name} — ${site.url}`);
    let html: string;
    try {
      const response = await fetch(site.url, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; ContinuumBot/0.1)" },
      });
      if (!response.ok) {
        console.log(`fetch failed: HTTP ${response.status} — skipping site`);
        continue;
      }
      html = await response.text();
    } catch (error) {
      console.log(`fetch failed: ${String(error)} — skipping site`);
      continue;
    }
    const { cards, skipped } = site.parse(html);
    for (const line of skipped) {
      console.log(`skip     ${line}`);
    }
    for (const card of cards) {
      if (card.endsOn < today) {
        continue; // archive editions — not proposals
      }
      const result = await importEvent(
        { ...card, venue: null, classes: site.classes, expected: false },
        { approve: false, source: "harvest" },
      );
      if (result.outcome === "created") {
        console.log(`PROPOSED ${card.name} (${card.startsOn}) → ${result.slug}`);
      } else if (result.outcome === "duplicate") {
        console.log(`skip     duplicate ${result.slug}`);
      } else {
        console.log(`skip     ${result.reason}`);
      }
    }
  }
  console.log("\nharvest done — proposals await /admin/review?filter=events.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

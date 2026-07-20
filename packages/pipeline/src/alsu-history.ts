import "./env";
import { parseRegionalDate } from "@continuum/shared";
import { db, documents } from "@continuum/db";
import { FETCH_TIMEOUT_MS, USER_AGENT, delay, partitionByExisting, sha256 } from "./crawl-shared";
import { existingCaseRefs } from "./registry";
import { mapFilingToFact } from "./filings-map";
import { parseAlsuProdaje, parseAlsuStecajevi } from "./registries";
import type { RegistryItem } from "./registries";

/**
 * ALSU history backfill: pages both listings newest-first until items fall
 * outside the --months cutoff (3 consecutive dated out-of-range items), or a
 * hard cap of 120 pages per listing. Idempotent: caseRef/url dedup skips
 * everything already stored.
 *
 * Usage: pnpm alsu:history -- --months 12 [--approve]
 *   --months N   how far back to walk (default 12)
 *   --approve    store facts as APPROVED (verified_by 'operator-backfill').
 *                Typing this flag is the human approval act for historical
 *                registry data; without it, every fact lands in the review
 *                queue as usual. Never defaulted, never read from env.
 */

const HARD_PAGE_CAP = 120;
const PAGE_DELAY_MS = 2_000;

type ListingSpec = {
  name: string;
  listing: "alsu-stecajevi" | "alsu-prodaje";
  baseUrl: string;
  parse: (html: string) => RegistryItem[];
  dateKey: "openedOn" | "saleDate";
  dedup: "caseRef" | "url";
};

const LISTINGS: ListingSpec[] = [
  {
    name: "Стечајни предмети (cases)",
    listing: "alsu-stecajevi",
    baseUrl: "https://alsu.gov.rs/ci/stecajni-postupak/stecajevi/",
    parse: parseAlsuStecajevi,
    dateKey: "openedOn",
    dedup: "caseRef",
  },
  {
    name: "Огласи продаје (sales)",
    listing: "alsu-prodaje",
    baseUrl: "https://alsu.gov.rs/ci/stecajni-postupak/oglasi-prodaje/",
    parse: parseAlsuProdaje,
    dateKey: "saleDate",
    dedup: "url",
  },
];

async function fetchPage(baseUrl: string, page: number): Promise<string> {
  const url = page === 1 ? baseUrl : `${baseUrl}?paged=${page}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

type ListingStats = {
  pages: number;
  found: number;
  fresh: number;
  skipped: number;
  facts: number;
  matched: number;
  provisional: number;
};

async function walkListing(
  spec: ListingSpec,
  cutoffIso: string,
  approve: boolean,
): Promise<ListingStats> {
  const stats: ListingStats = {
    pages: 0,
    found: 0,
    fresh: 0,
    skipped: 0,
    facts: 0,
    matched: 0,
    provisional: 0,
  };
  let outOfRangeStreak = 0;

  for (let page = 1; page <= HARD_PAGE_CAP; page += 1) {
    if (page > 1) {
      await delay(PAGE_DELAY_MS);
    }
    const items = spec.parse(await fetchPage(spec.baseUrl, page));
    stats.pages += 1;
    stats.found += items.length;
    if (items.length === 0) {
      break;
    }

    let known: Set<string>;
    if (spec.dedup === "caseRef") {
      const refs = items
        .map((item) => item.meta.caseRef)
        .filter((ref): ref is string => ref !== undefined && ref !== "");
      known = await existingCaseRefs(refs);
    } else {
      const { existing } = await partitionByExisting(items.map((item) => item.url));
      known = new Set(existing);
    }

    let stop = false;
    for (const item of items) {
      const rawDate = item.meta[spec.dateKey];
      const parsedDate = rawDate !== undefined ? parseRegionalDate(rawDate) : null;
      if (parsedDate !== null) {
        if (parsedDate < cutoffIso) {
          outOfRangeStreak += 1;
          if (outOfRangeStreak >= 3) {
            stop = true;
            break;
          }
          continue;
        }
        outOfRangeStreak = 0;
      }

      const isKnown =
        spec.dedup === "caseRef"
          ? item.meta.caseRef !== undefined && known.has(item.meta.caseRef)
          : known.has(item.url);
      if (isKnown) {
        stats.skipped += 1;
        continue;
      }

      // History mode stores the listing metadata as the document body instead
      // of fetching each detail page — ~1,500 extra detail fetches would
      // hammer ALSU for no mapping value (the mapper is meta-driven).
      const contentText = `${item.title}\n${Object.entries(item.meta)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}`;
      const inserted = await db
        .insert(documents)
        .values({
          url: item.url,
          title: item.title,
          docType: "filing",
          language: "sr",
          contentText,
          contentHash: sha256(contentText),
          fetchedAt: new Date(),
          meta: item.meta,
        })
        .returning();
      const doc = inserted[0];
      if (doc === undefined) {
        continue;
      }
      stats.fresh += 1;
      const mapped = await mapFilingToFact(doc, { approve });
      if (mapped !== null) {
        stats.facts += 1;
        if (mapped.outcome === "matched") {
          stats.matched += 1;
        } else {
          stats.provisional += 1;
        }
      }
      if (spec.dedup === "caseRef" && item.meta.caseRef !== undefined) {
        known.add(item.meta.caseRef);
      } else {
        known.add(item.url);
      }
    }
    if (stop) {
      break;
    }
  }
  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(
      "Usage: pnpm alsu:history -- --months 12 [--approve]\n" +
        "  --months N   walk back N months (default 12)\n" +
        "  --approve    store facts APPROVED (verified_by operator-backfill).\n" +
        "               Typing this flag is the human approval act; without it\n" +
        "               all facts land in the review queue as proposed.",
    );
    process.exit(0);
  }
  const monthsIdx = args.indexOf("--months");
  const months = monthsIdx >= 0 ? Number.parseInt(args[monthsIdx + 1] ?? "12", 10) : 12;
  const approve = args.includes("--approve");
  if (Number.isNaN(months) || months < 1) {
    throw new Error("--months must be a positive integer");
  }

  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  console.log(
    `ALSU history backfill: ${months} months (cutoff ${cutoffIso}) · mode: ${approve ? "APPROVE (operator-backfill)" : "proposed (review queue)"}\n`,
  );

  const t0 = Date.now();
  for (const spec of LISTINGS) {
    const stats = await walkListing(spec, cutoffIso, approve);
    console.log(
      `${spec.name}: pages ${stats.pages} · found ${stats.found} · new ${stats.fresh} · skipped ${stats.skipped} · facts ${stats.facts} (entities ${stats.matched} matched / ${stats.provisional} provisional)`,
    );
  }
  console.log(`\nelapsed: ${Math.round((Date.now() - t0) / 1000)}s`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

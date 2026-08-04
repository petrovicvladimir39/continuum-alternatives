import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * EUROPE DEPTH RUN — regenerate docs/EUROPE-SOURCE-CATALOG.md from the
 * per-country catalog JSONs (data/europe-depth/*-sources.json). Pure file
 * transform, $0, idempotent. The JSON is the record; the doc is the ledger
 * view. docs/register-catalog.md (the pre-run accessibility matrix) stays
 * untouched — this file EXTENDS the standing catalog, never re-writes it.
 *
 *   tsx src/europe-catalog-docs.ts
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CATALOG_DIR = path.join(REPO_ROOT, "data", "europe-depth");
const OUT = path.join(REPO_ROOT, "docs", "EUROPE-SOURCE-CATALOG.md");

type CatalogSource = {
  name: string;
  url: string;
  side: string;
  category: string;
  tier: string;
  accessMethod: string;
  verdict: string;
  rssUrl?: string;
};

type CountryCatalog = {
  country: string;
  sources: CatalogSource[];
  competitorAnalysis?: { platform: string; coverageNotes: string; publicSourcesTheyUse: string }[];
  searchedButAbsent?: string;
};

const TIER_ORDER = [
  "tier1_registry",
  "tier2_regulator",
  "tier3_gazette",
  "tier4_exchange_corporate",
  "signals_press",
];

function main(): void {
  if (!existsSync(CATALOG_DIR)) {
    console.error("no catalog dir");
    process.exit(1);
  }
  const files = readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith("-sources.json"))
    .sort();
  const lines: string[] = [
    "# EUROPE DEPTH RUN — per-country source ledger",
    "",
    "Generated from `data/europe-depth/*-sources.json` by `europe-catalog-docs.ts`",
    "— edit the JSON, not this file. Target: ≥50 genuine business-grade public",
    "sources per country; true counts reported honestly, never padded. Access",
    "methods recorded as probed; blocked routes are documented, not hidden.",
    "",
  ];
  for (const file of files) {
    const cat = JSON.parse(readFileSync(path.join(CATALOG_DIR, file), "utf8")) as CountryCatalog;
    const cc = cat.country.toUpperCase();
    const byTier = new Map<string, number>();
    for (const s of cat.sources) {
      byTier.set(s.tier, (byTier.get(s.tier) ?? 0) + 1);
    }
    const entities = cat.sources.filter((s) => s.side === "entities").length;
    const news = cat.sources.length - entities;
    lines.push(`## ${cc} — ${cat.sources.length} sources (${entities} entities-side · ${news} news-side)`);
    lines.push("");
    lines.push(
      `Tier split: ${TIER_ORDER.map((t) => `${t.replace("_", " ")} ${byTier.get(t) ?? 0}`).join(" · ")}`,
    );
    lines.push("");
    lines.push("| Source | Side | Category | Tier | Access | Verdict |");
    lines.push("|---|---|---|---|---|---|");
    for (const t of TIER_ORDER) {
      for (const s of cat.sources.filter((x) => x.tier === t)) {
        const name = `[${s.name.replace(/\|/g, "/")}](${s.url})`;
        lines.push(
          `| ${name} | ${s.side} | ${s.category} | ${s.tier} | ${s.accessMethod} | ${s.verdict.replace(/\|/g, "/").slice(0, 220)} |`,
        );
      }
    }
    lines.push("");
    if (cat.competitorAnalysis !== undefined && cat.competitorAnalysis.length > 0) {
      lines.push(`### ${cc} — competitor / provider landscape (market map only; never scraped)`);
      lines.push("");
      for (const comp of cat.competitorAnalysis) {
        lines.push(
          `- **${comp.platform}** — ${comp.coverageNotes.slice(0, 300)} _Public sources they draw on:_ ${comp.publicSourcesTheyUse.slice(0, 300)}`,
        );
      }
      lines.push("");
    }
    if (cat.searchedButAbsent !== undefined && cat.searchedButAbsent !== "") {
      lines.push(`### ${cc} — searched but genuinely absent (honesty record)`);
      lines.push("");
      lines.push(cat.searchedButAbsent);
      lines.push("");
    }
  }
  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`wrote ${OUT} (${files.length} countries)`);
}

main();

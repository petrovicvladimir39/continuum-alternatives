import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * EUROPE DEPTH RUN — competitor & intelligence-provider landscape.
 *
 *   tsx src/europe-competitors-docs.ts
 *
 * Generates docs/COMPETITOR-LANDSCAPE.md from the per-country catalog JSONs
 * (data/europe-depth/*-sources.json, competitorAnalysis blocks). This is a
 * MARKET MAP built from public research — what each provider covers, and,
 * the operative part, WHICH PUBLIC PRIMARY SOURCES they draw on, so Continuum
 * can go to those sources directly instead of through them.
 *
 * Kept separate from docs/EUROPE-SOURCE-CATALOG.md on purpose: the catalog is
 * the harvest plan (sources we ingest), this is the competitive picture (firms
 * we position against). No competitor platform is ingested or scraped.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CATALOG_DIR = path.join(REPO_ROOT, "data", "europe-depth");
const OUT = path.join(REPO_ROOT, "docs", "COMPETITOR-LANDSCAPE.md");

type Competitor = { platform: string; coverageNotes: string; publicSourcesTheyUse: string };
type CountryCatalog = { country: string; competitorAnalysis?: Competitor[] };

/** Label variants that are the same company. */
const ALIASES: Record<string, string> = {
  "dealroom.co": "Dealroom",
  "dealroom.co.": "Dealroom",
  "moody's orbis": "Moody's / Orbis (Bureau van Dijk)",
  "moody's": "Moody's / Orbis (Bureau van Dijk)",
  "moody's analytics": "Moody's / Orbis (Bureau van Dijk)",
  "bureau van dijk": "Moody's / Orbis (Bureau van Dijk)",
  orbis: "Moody's / Orbis (Bureau van Dijk)",
  "opencorporates.com": "OpenCorporates",
  "crunchbase.com": "Crunchbase",
  "pitchbook (morningstar)": "PitchBook",
  "preqin (blackrock)": "Preqin",
  "emis (isi emerging markets group)": "EMIS",
  "with intelligence (formerly pageant media)": "With Intelligence",
};

/** The global incumbents, for the tiered view. */
const GLOBAL = new Set([
  "Preqin",
  "PitchBook",
  "Crunchbase",
  "Dealroom",
  "Moody's / Orbis (Bureau van Dijk)",
  "Bloomberg",
  "S&P Capital IQ",
  "Refinitiv",
  "LSEG",
  "Dun & Bradstreet",
  "Mergermarket",
  "Debtwire",
  "With Intelligence",
  "OpenCorporates",
  "Tracxn",
  "CB Insights",
]);

function canonical(raw: string): string {
  const head = raw.split(/\s*[(—–]|\s+[-–—]\s+|\s*\/\s*/)[0]?.trim() ?? raw.trim();
  const key = head.toLowerCase().replace(/[.,;:]+$/, "");
  return ALIASES[key] ?? ALIASES[raw.trim().toLowerCase()] ?? head;
}

function clean(text: string, max: number): string {
  return text.replace(/\s+/g, " ").replace(/\|/g, "/").trim().slice(0, max);
}

function main(): void {
  const files = readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith("-sources.json"))
    .sort();

  type Entry = { country: string; notes: string; sources: string; rawLabel: string };
  const byPlatform = new Map<string, Entry[]>();
  const byCountry = new Map<string, { platform: string; canon: string; notes: string; sources: string }[]>();

  for (const file of files) {
    const cat = JSON.parse(readFileSync(path.join(CATALOG_DIR, file), "utf8")) as CountryCatalog;
    const cc = cat.country.toUpperCase();
    const list = cat.competitorAnalysis ?? [];
    byCountry.set(
      cc,
      list.map((c) => ({
        platform: c.platform,
        canon: canonical(c.platform),
        notes: c.coverageNotes,
        sources: c.publicSourcesTheyUse,
      })),
    );
    for (const c of list) {
      const canon = canonical(c.platform);
      const arr = byPlatform.get(canon) ?? [];
      arr.push({
        country: cc,
        notes: c.coverageNotes,
        sources: c.publicSourcesTheyUse,
        rawLabel: c.platform,
      });
      byPlatform.set(canon, arr);
    }
  }

  const ranked = [...byPlatform.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  const globals = ranked.filter(([name]) => GLOBAL.has(name));
  const regionals = ranked.filter(([name]) => !GLOBAL.has(name) && (byPlatform.get(name)?.length ?? 0) > 1);
  const locals = ranked.filter(([name]) => !GLOBAL.has(name) && (byPlatform.get(name)?.length ?? 0) === 1);

  const totalEntries = [...byPlatform.values()].reduce((n, a) => n + a.length, 0);

  const lines: string[] = [
    "# EUROPE DEPTH RUN — competitor & intelligence-provider landscape",
    "",
    "Generated from `data/europe-depth/*-sources.json` (competitorAnalysis blocks)",
    "by `europe-competitors-docs.ts` — edit the JSON, not this file.",
    "",
    "**What this is.** A market map of every data / intelligence platform that",
    "covers European alternative investments, country by country, built from",
    "public research: what each one covers, where it is strong, where it is thin,",
    "and — the operative column — **which public primary sources it visibly draws",
    "on**. That last column is the actionable part: wherever a provider is",
    "reselling a national register, gazette or regulator file, Continuum can take",
    "that source directly, at $0, with provenance the reseller cannot offer.",
    "",
    "**What this is not.** No competitor platform is ingested, scraped, or",
    "queried by the pipeline. Nothing here is derived from a competitor's own",
    "database, paid export, or ToS-locked API — only from public descriptions of",
    "their coverage. It is kept in its own file, separate from",
    "`docs/EUROPE-SOURCE-CATALOG.md` (the harvest plan), precisely so the two",
    "never mix: that file lists sources we ingest, this file lists firms we",
    "position against.",
    "",
    `**Scale.** ${totalEntries} provider observations across ${byCountry.size} countries ·`,
    `${ranked.length} distinct platforms · ${globals.length} global incumbents ·`,
    `${regionals.length} multi-country regional players · ${locals.length} single-market local players.`,
    "",
    "---",
    "",
    "## 1. Ranking — who actually covers Europe",
    "",
    "Ranked by number of national markets where the provider surfaced as a",
    "relevant player. Reach is not the same as depth: read the gap column.",
    "",
    "| # | Platform | Markets | Tier | Markets covered | Representative observation |",
    "|---|---|---|---|---|---|",
  ];

  let rank = 1;
  for (const [name, entries] of ranked.slice(0, 30)) {
    const tier = GLOBAL.has(name) ? "global" : entries.length > 1 ? "regional" : "local";
    const markets = entries
      .map((e) => e.country)
      .sort()
      .join(" ");
    // One observation, quoted as-is from a single market, so nothing reads as
    // a synthesized claim about the provider overall. Per-market detail and
    // the strong/thin picture live in sections 2-5.
    const sample = entries[0];
    const observation = `${sample?.country ?? "?"}: ${clean(sample?.notes ?? "", 220)}`;
    lines.push(
      `| ${rank} | **${name}** | ${entries.length} | ${tier} | ${markets.length > 120 ? markets.slice(0, 120) + "…" : markets} | ${observation} |`,
    );
    rank += 1;
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 2. Global incumbents — full observations");
  lines.push("");
  lines.push(
    "The firms Continuum is measured against. For each: every country-level",
    "observation gathered, and the public sources they are visibly built on.",
    "",
  );
  for (const [name, entries] of globals) {
    lines.push(`### ${name} — seen in ${entries.length} markets`);
    lines.push("");
    lines.push(`Markets: ${entries.map((e) => e.country).sort().join(", ")}`);
    lines.push("");
    lines.push("| Market | Coverage observed | Public sources they draw on |");
    lines.push("|---|---|---|");
    for (const e of entries.sort((a, b) => a.country.localeCompare(b.country))) {
      lines.push(`| ${e.country} | ${clean(e.notes, 400)} | ${clean(e.sources, 400)} |`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 3. Regional players (multi-country)");
  lines.push("");
  lines.push(
    "The ones that matter most for the CEE/SEE depth thesis — these, not the",
    "global incumbents, are the incumbents in the markets Continuum leads with.",
    "",
  );
  for (const [name, entries] of regionals) {
    lines.push(`### ${name} — ${entries.map((e) => e.country).sort().join(", ")}`);
    lines.push("");
    for (const e of entries.sort((a, b) => a.country.localeCompare(b.country))) {
      lines.push(`- **${e.country}** — ${clean(e.notes, 500)}`);
      lines.push(`  - _Public sources:_ ${clean(e.sources, 400)}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 4. Single-market local players");
  lines.push("");
  lines.push(
    "Domestic providers, registry resellers, and national business-information",
    "houses. Individually small; collectively they are what a buyer in that",
    "market compares Continuum against.",
    "",
  );
  const localsByCountry = new Map<string, { name: string; notes: string; sources: string }[]>();
  for (const [name, entries] of locals) {
    const e = entries[0];
    if (e === undefined) {
      continue;
    }
    const arr = localsByCountry.get(e.country) ?? [];
    arr.push({ name, notes: e.notes, sources: e.sources });
    localsByCountry.set(e.country, arr);
  }
  for (const cc of [...localsByCountry.keys()].sort()) {
    lines.push(`**${cc}**`);
    lines.push("");
    for (const l of localsByCountry.get(cc) ?? []) {
      lines.push(`- **${l.name}** — ${clean(l.notes, 400)}`);
      lines.push(`  - _Public sources:_ ${clean(l.sources, 300)}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 5. Country-by-country view");
  lines.push("");
  lines.push(
    "The full picture per market, in the order a go-to-market conversation",
    "would need it.",
    "",
  );
  for (const cc of [...byCountry.keys()].sort()) {
    const list = byCountry.get(cc) ?? [];
    lines.push(`### ${cc} — ${list.length} providers observed`);
    lines.push("");
    if (list.length === 0) {
      lines.push("_No provider observations recorded._");
      lines.push("");
      continue;
    }
    lines.push("| Provider | Coverage | Public sources they draw on |");
    lines.push("|---|---|---|");
    for (const c of list) {
      lines.push(`| ${c.platform.replace(/\|/g, "/")} | ${clean(c.notes, 350)} | ${clean(c.sources, 350)} |`);
    }
    lines.push("");
  }

  writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(
    `wrote ${OUT} — ${totalEntries} observations · ${ranked.length} platforms · ${byCountry.size} countries`,
  );
}

main();

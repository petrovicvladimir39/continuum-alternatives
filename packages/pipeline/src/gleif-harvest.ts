import "./env";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EUROPE_COUNTRIES } from "@continuum/shared";
import { RegisterImporter, proposeManagesEdges, type RegisterImportOutcome } from "@continuum/db";
import {
  GLEIF_API,
  GLEIF_RR_LATEST,
  gleifRecordToRow,
  parseRrCsv,
  splitCap,
  unzipFirstMatch,
  type GleifApiRecord,
} from "./gleif";

/**
 * GLEIF mega-harvest (reset build Part 2a) — $0 deterministic code, no LLM.
 *
 *   pnpm gleif:harvest -- --countries LU,IE,GB --cap 12000 [--skip-rr] [--reset]
 *
 * Level 1: pages the public GLEIF JSON API per country (category=FUND,
 * status=ACTIVE), importing through the shared register path — LEI is the
 * deterministic resolution key, rows activate directly.
 * Level 2: downloads the RR golden-copy zip once (~23 MB), extracts ACTIVE
 * IS_FUND-MANAGED_BY pairs for harvested funds, ingests missing managers by
 * batched LEI lookup, and proposes manages edges (manager -> fund).
 *
 * Resumable: cursor state in data/.gleif/state.json survives interruption;
 * the preloaded registryId map makes re-runs idempotent (known LEIs skip).
 */

const PAGE_SIZE = 200;
const POLITENESS_MS = 350;
const STATE_DIR = path.resolve(process.cwd(), "../..", "data", ".gleif");
const STATE_FILE = path.join(STATE_DIR, "state.json");
const RR_CACHE = path.join(STATE_DIR, "rr-golden-copy.zip");
const RR_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CountryState = { nextPage: number; harvested: number; done: boolean };
type HarvestState = { countries: Record<string, CountryState> };

type CountryReport = {
  fetched: number;
  created: number;
  merged: number;
  merged_registry: number;
  ambiguous: number;
  skipped: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(): { countries: string[]; cap: number; skipRr: boolean; reset: boolean } {
  const argv = process.argv.slice(2);
  let countries: string[] = [];
  let cap = 1000;
  let skipRr = false;
  let reset = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--countries" && argv[i + 1]) {
      countries = [...new Set(argv[++i]!.split(",").map((c) => c.trim().toUpperCase()))].filter(
        Boolean,
      );
    } else if (arg === "--cap" && argv[i + 1]) {
      cap = Number.parseInt(argv[++i]!, 10);
    } else if (arg === "--skip-rr") {
      skipRr = true;
    } else if (arg === "--reset") {
      reset = true;
    }
  }
  if (countries.length === 0 || !Number.isFinite(cap) || cap <= 0) {
    console.error("usage: pnpm gleif:harvest -- --countries LU,IE,GB --cap 12000 [--skip-rr] [--reset]");
    process.exit(1);
  }
  const outside = countries.filter((c) => !EUROPE_COUNTRIES.includes(c));
  if (outside.length > 0) {
    console.error(`countries outside EUROPE_COUNTRIES scope: ${outside.join(", ")}`);
    process.exit(1);
  }
  return { countries, cap, skipRr, reset };
}

function loadState(reset: boolean): HarvestState {
  if (!reset && existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, "utf8")) as HarvestState;
    } catch {
      // fall through to fresh state
    }
  }
  return { countries: {} };
}

function saveState(state: HarvestState): void {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function fetchJson(url: string, attempt = 1): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/vnd.api+json", "user-agent": "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)" },
  });
  if (response.status === 429 || response.status >= 500) {
    if (attempt >= 5) {
      throw new Error(`GLEIF ${response.status} after ${attempt} attempts: ${url}`);
    }
    const backoff = 2000 * attempt;
    console.log(`  ${response.status} — backing off ${backoff}ms`);
    await sleep(backoff);
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`GLEIF ${response.status}: ${url}`);
  }
  return response.json();
}

async function harvestCountry(
  importer: RegisterImporter,
  state: HarvestState,
  country: string,
  quota: number,
  report: CountryReport,
): Promise<void> {
  const cs: CountryState = state.countries[country] ?? { nextPage: 1, harvested: 0, done: false };
  state.countries[country] = cs;
  while (!cs.done && cs.harvested < quota) {
    const remaining = quota - cs.harvested;
    const size = Math.min(PAGE_SIZE, remaining);
    const url =
      `${GLEIF_API}/lei-records?filter%5Bentity.legalAddress.country%5D=${country}` +
      `&filter%5Bentity.category%5D=FUND&filter%5Bentity.status%5D=ACTIVE` +
      `&page%5Bsize%5D=${size}&page%5Bnumber%5D=${cs.nextPage}`;
    const payload = (await fetchJson(url)) as {
      data: GleifApiRecord[];
      meta: { pagination: { lastPage: number } };
    };
    for (const record of payload.data) {
      const row = gleifRecordToRow(record, { requireCategory: "FUND" });
      if (row === null) {
        report.skipped += 1;
        continue;
      }
      const result = await importer.importRow(row);
      report.fetched += 1;
      cs.harvested += 1;
      const key = result.outcome as Exclude<RegisterImportOutcome, "skipped">;
      if (key in report) {
        report[key as keyof CountryReport] += 1;
      }
    }
    if (cs.nextPage >= payload.meta.pagination.lastPage || payload.data.length === 0) {
      cs.done = true;
    }
    cs.nextPage += 1;
    saveState(state);
    process.stdout.write(
      `\r${country}: ${cs.harvested}/${quota} (page ${cs.nextPage - 1})           `,
    );
    await sleep(POLITENESS_MS);
  }
  process.stdout.write("\n");
}

async function downloadRr(): Promise<Buffer> {
  if (existsSync(RR_CACHE)) {
    const age = Date.now() - statSync(RR_CACHE).mtimeMs;
    if (age < RR_CACHE_MAX_AGE_MS) {
      console.log("RR golden copy: using cached download");
      return readFileSync(RR_CACHE);
    }
  }
  console.log("RR golden copy: fetching latest publish metadata…");
  const meta = (await fetchJson(GLEIF_RR_LATEST)) as {
    data: { full_file: { csv: { url: string; size_human_readable: string } } };
  };
  const url = meta.data.full_file.csv.url;
  console.log(`RR golden copy: downloading ${url} (${meta.data.full_file.csv.size_human_readable})`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`RR download failed: ${response.status}`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(RR_CACHE, buf);
  return buf;
}

async function ingestManagersAndEdges(importer: RegisterImporter): Promise<void> {
  const zip = await downloadRr();
  const { name, data } = unzipFirstMatch(zip, ".csv");
  console.log(`RR golden copy: extracted ${name} (${(data.length / 1e6).toFixed(1)} MB)`);
  const pairs = parseRrCsv(data.toString("utf8"));
  console.log(`RR golden copy: ${pairs.length} ACTIVE fund→manager relationships total`);

  // Only relationships whose FUND we hold (this run or earlier ones).
  const relevant = pairs.filter((p) => importer.entityIdFor(p.fundLei) !== undefined);
  console.log(`RR golden copy: ${relevant.length} relationships touch harvested funds`);

  const missingManagers = [
    ...new Set(
      relevant.map((p) => p.managerLei).filter((lei) => importer.entityIdFor(lei) === undefined),
    ),
  ];
  console.log(`managers: ${missingManagers.length} not yet in corpus — fetching in batches`);
  for (let i = 0; i < missingManagers.length; i += 50) {
    const chunk = missingManagers.slice(i, i + 50);
    const url = `${GLEIF_API}/lei-records?filter%5Blei%5D=${chunk.join(",")}&page%5Bsize%5D=${chunk.length}`;
    const payload = (await fetchJson(url)) as { data: GleifApiRecord[] };
    for (const record of payload.data) {
      const row = gleifRecordToRow(record, { noteSuffix: "fund manager via RR" });
      if (row !== null) {
        await importer.importRow(row);
      }
    }
    process.stdout.write(`\rmanagers: ${Math.min(i + 50, missingManagers.length)}/${missingManagers.length}   `);
    await sleep(POLITENESS_MS);
  }
  process.stdout.write("\n");
  await importer.flush();

  const edgePairs = relevant
    .map((p) => ({
      managerEntityId: importer.entityIdFor(p.managerLei),
      fundEntityId: importer.entityIdFor(p.fundLei),
    }))
    .filter(
      (p): p is { managerEntityId: string; fundEntityId: string } =>
        p.managerEntityId !== undefined &&
        p.fundEntityId !== undefined &&
        p.managerEntityId !== p.fundEntityId,
    );
  const inserted = await proposeManagesEdges(edgePairs);
  console.log(`edges: ${inserted} PROPOSED manages edges inserted (dedup against existing)`);
}

async function main(): Promise<void> {
  const { countries, cap, skipRr, reset } = parseArgs();
  const quotas = splitCap(cap, countries);
  const state = loadState(reset);

  const importer = new RegisterImporter();
  console.log("loading corpus registry map…");
  await importer.init();

  const reports = new Map<string, CountryReport>();
  for (const country of countries) {
    const report: CountryReport = {
      fetched: 0,
      created: 0,
      merged: 0,
      merged_registry: 0,
      ambiguous: 0,
      skipped: 0,
    };
    reports.set(country, report);
    await harvestCountry(importer, state, country, quotas.get(country) ?? 0, report);
    await importer.flush();
  }

  if (!skipRr) {
    await ingestManagersAndEdges(importer);
  }
  await importer.flush();

  console.log("\n=== GLEIF harvest report ===");
  console.log("country  fetched  new  merged  lei-known  ambiguous  skipped");
  for (const [country, r] of reports) {
    console.log(
      `${country.padEnd(7)}  ${String(r.fetched).padStart(7)}  ${String(r.created).padStart(3)}  ${String(r.merged).padStart(6)}  ${String(r.merged_registry).padStart(9)}  ${String(r.ambiguous).padStart(9)}  ${String(r.skipped).padStart(7)}`,
    );
  }
  console.log(
    `totals: created ${importer.counts.created}, merged ${importer.counts.merged}, lei-known ${importer.counts.merged_registry}, ambiguous ${importer.counts.ambiguous}, skipped ${importer.counts.skipped}`,
  );
  if (importer.ambiguousRows.length > 0) {
    console.log("\nambiguous (skipped, review manually):");
    for (const line of importer.ambiguousRows.slice(0, 50)) {
      console.log(`  ${line}`);
    }
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import "./env";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, db, eq, sql, sources } from "@continuum/db";
import { EUROPE_TAXONOMY, LEGACY_CLASS_TO_L1 } from "@continuum/shared";
import { FETCH_TIMEOUT_MS, USER_AGENT } from "./crawl-shared";

/**
 * EUROPE DEPTH RUN — orchestration utilities. One ledger, one catalog shape,
 * one report format, applied identically to every country (no regional bias).
 *
 *   tsx src/europe-depth.ts ledger                      # print running ledger
 *   tsx src/europe-depth.ts seed-sources --country DE   # seed news sources from
 *                                                       # data/europe-depth/de-sources.json
 *   tsx src/europe-depth.ts report --country DE         # print report block for
 *                                                       # docs/EUROPE-DEPTH-REPORT.md
 *   tsx src/europe-depth.ts snapshot --country DE       # record before-counts
 *
 * Budget law: EUROPE_DEPTH_CAP (default $20) TOTAL, $0.45 per country —
 * extraction callers check countryBudgetLeft() and stop cleanly at either
 * limit, logging the backlog. Everything else is $0 deterministic.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const LEDGER_PATH = path.join(REPO_ROOT, "data", "europe-depth-ledger.json");
const CATALOG_DIR = path.join(REPO_ROOT, "data", "europe-depth");

export const TOTAL_CAP_USD = Number.parseFloat(process.env.EUROPE_DEPTH_CAP ?? "20");
export const COUNTRY_CAP_USD = 0.45;

export type DepthLedger = {
  totalCapUsd: number;
  perCountryCapUsd: number;
  /** USD spent per country (extraction + guarded enrichment). */
  spent: Record<string, number>;
  /** Countries fully committed (five steps done). */
  completed: string[];
  /** Before-count snapshots per country, taken at country start. */
  before: Record<string, { entities: number; facts: number; takenAt: string }>;
  /** Honest per-country extraction backlog left behind by the sub-budget. */
  backlog: Record<string, string>;
};

export function loadLedger(): DepthLedger {
  if (!existsSync(LEDGER_PATH)) {
    return {
      totalCapUsd: TOTAL_CAP_USD,
      perCountryCapUsd: COUNTRY_CAP_USD,
      spent: {},
      completed: [],
      before: {},
      backlog: {},
    };
  }
  return JSON.parse(readFileSync(LEDGER_PATH, "utf8")) as DepthLedger;
}

export function saveLedger(ledger: DepthLedger): void {
  mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");
}

export function totalSpent(ledger: DepthLedger): number {
  return Object.values(ledger.spent).reduce((a, b) => a + b, 0);
}

export function countryBudgetLeft(ledger: DepthLedger, cc: string): number {
  const spent = ledger.spent[cc] ?? 0;
  return Math.max(0, Math.min(COUNTRY_CAP_USD - spent, TOTAL_CAP_USD - totalSpent(ledger)));
}

export function printLedger(ledger: DepthLedger): void {
  const total = totalSpent(ledger);
  console.log(
    `EUROPE-DEPTH LEDGER: $${total.toFixed(3)} of $${ledger.totalCapUsd.toFixed(2)} total cap · ` +
      `${ledger.completed.length}/39 countries committed`,
  );
  for (const [cc, usd] of Object.entries(ledger.spent).sort()) {
    console.log(`  ${cc}  $${usd.toFixed(3)} / $${ledger.perCountryCapUsd.toFixed(2)}`);
  }
}

// ── Source catalog shape (written by research, consumed by seeding + docs) ──

export type CatalogSource = {
  name: string;
  url: string;
  side: "entities" | "news";
  category: string;
  tier:
    | "tier1_registry"
    | "tier2_regulator"
    | "tier3_gazette"
    | "tier4_exchange_corporate"
    | "signals_press";
  accessMethod:
    | "rss"
    | "parseable-index"
    | "download"
    | "api"
    | "js-blocked"
    | "robots-disallowed"
    | "unknown";
  verdict: string;
  rssUrl?: string;
  language?: string;
};

export type CountryCatalog = {
  country: string;
  sources: CatalogSource[];
  competitorAnalysis?: { platform: string; coverageNotes: string; publicSourcesTheyUse: string }[];
  searchedButAbsent?: string;
};

export function loadCatalog(cc: string): CountryCatalog {
  const file = path.join(CATALOG_DIR, `${cc.toLowerCase()}-sources.json`);
  return JSON.parse(readFileSync(file, "utf8")) as CountryCatalog;
}

async function probeRss(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*",
      },
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

/**
 * Seed the country's NEWS sources from the catalog JSON — always INACTIVE
 * (activation is the budgeted Step 3 decision, max 12/country). RSS urls are
 * probed live; dead feeds are seeded with fetch_method http_simple only if
 * their index answers, else skipped with a log line. Entity-side sources are
 * NOT seeded here — they are harvested by adapters and documented in the
 * catalog ledger. Idempotent: existing (name,country) rows are left alone.
 */
export async function seedCountrySources(cc: string): Promise<void> {
  const catalog = loadCatalog(cc);
  const news = catalog.sources.filter((s) => s.side === "news");
  let created = 0;
  let known = 0;
  let skipped = 0;
  for (const item of news) {
    const existing = await db
      .select({ id: sources.id })
      .from(sources)
      .where(and(eq(sources.name, item.name), eq(sources.country, cc.toUpperCase())));
    if (existing.length > 0) {
      known += 1;
      continue;
    }
    let fetchMethod = "http_simple";
    let url = item.url;
    if (item.rssUrl !== undefined && item.rssUrl !== "") {
      if (await probeRss(item.rssUrl)) {
        fetchMethod = "rss";
        url = item.rssUrl;
      } else {
        console.log(`  DEAD FEED ${item.name} (${item.rssUrl}) — skipped`);
        skipped += 1;
        continue;
      }
    } else if (item.accessMethod === "js-blocked" || item.accessMethod === "robots-disallowed") {
      console.log(`  BLOCKED ${item.name} (${item.accessMethod}) — documented, not seeded`);
      skipped += 1;
      continue;
    }
    await db.insert(sources).values({
      name: item.name,
      url,
      country: cc.toUpperCase(),
      sourceType: "press",
      fetchMethod,
      sourceTier: item.tier,
      active: false,
      config: { maxItemsPerRun: 5, ...(item.language ? { language: item.language } : {}) },
    });
    created += 1;
  }
  console.log(
    `seed-sources ${cc}: ${created} seeded inactive · ${known} already known · ${skipped} skipped (dead/blocked)`,
  );
}

/**
 * Step-3 activation: at most 12 news sources per country — healthy RSS first,
 * then up to 4 crawl-index (http_simple) sources. Idempotent: already-active
 * country sources count against the cap.
 */
export async function activateCountrySources(cc: string): Promise<void> {
  const country = cc.toUpperCase();
  const MAX_ACTIVE = 12;
  const MAX_CRAWL = 4;
  const rows = await db
    .select({
      id: sources.id,
      name: sources.name,
      fetchMethod: sources.fetchMethod,
      active: sources.active,
    })
    .from(sources)
    .where(and(eq(sources.country, country), eq(sources.sourceType, "press")));
  let active = rows.filter((r) => r.active === true).length;
  let crawlActive = rows.filter((r) => r.active === true && r.fetchMethod === "http_simple").length;
  const candidates = [
    ...rows.filter((r) => r.active !== true && r.fetchMethod === "rss"),
    ...rows.filter((r) => r.active !== true && r.fetchMethod === "http_simple"),
  ];
  const activated: string[] = [];
  for (const row of candidates) {
    if (active >= MAX_ACTIVE) {
      break;
    }
    if (row.fetchMethod === "http_simple") {
      if (crawlActive >= MAX_CRAWL) {
        continue;
      }
      crawlActive += 1;
    }
    await db.update(sources).set({ active: true }).where(eq(sources.id, row.id));
    active += 1;
    activated.push(`${row.name} (${row.fetchMethod})`);
  }
  console.log(
    `activate ${country}: ${activated.length} newly activated · ${active} now active (cap ${MAX_ACTIVE}, crawl ${crawlActive}/${MAX_CRAWL})`,
  );
  for (const name of activated) {
    console.log(`  + ${name}`);
  }
}

// ── Country report ──────────────────────────────────────────────────────────

const L1_LABELS = new Map(EUROPE_TAXONOMY.map((c) => [c.slug, c.label]));

export async function countryReport(cc: string): Promise<string> {
  const ledger = loadLedger();
  const country = cc.toUpperCase();
  const lines: string[] = [];

  const ent = await db.execute(
    sql`select count(*)::int n, count(*) filter (where status='active')::int active
        from entities where country = ${country}`,
  );
  const entRow = ent.rows[0] as { n: number; active: number };
  const before = ledger.before[country];

  // Six-class Level-1 counts (legacy rows mapped onto the six-class spine;
  // zeros shown honestly). Level-3 strategies found listed separately.
  const cls = await db.execute(
    sql`select ec.asset_class, ec.sub_class, ec.strategy, count(distinct ec.entity_id)::int n
        from entity_classifications ec join entities e on e.id = ec.entity_id
        where e.country = ${country}
        group by 1,2,3`,
  );
  const l1Counts = new Map<string, number>();
  const l3Found = new Set<string>();
  for (const slug of L1_LABELS.keys()) {
    l1Counts.set(slug, 0);
  }
  for (const row of cls.rows as { asset_class: string; sub_class: string | null; strategy: string; n: number }[]) {
    const l1 = LEGACY_CLASS_TO_L1[row.asset_class] ?? (L1_LABELS.has(row.asset_class) ? row.asset_class : undefined);
    if (l1 !== undefined) {
      l1Counts.set(l1, (l1Counts.get(l1) ?? 0) + row.n);
    }
    if (row.strategy !== "") {
      l3Found.add(row.strategy);
    }
  }
  const classified = await db.execute(
    sql`select count(distinct ec.entity_id)::int n
        from entity_classifications ec join entities e on e.id = ec.entity_id
        where e.country = ${country}`,
  );
  const classifiedN = (classified.rows[0] as { n: number }).n;

  // Field coverage across the schema groups (organizations of this country).
  const cov = await db.execute(sql`
    select count(*)::int orgs,
      count(o.legal_name)::int legal_name, count(o.registry_id)::int registration_no,
      count(o.lei_code)::int lei, count(o.tax_id)::int vat,
      count(o.legal_form_native)::int legal_form, count(o.legal_status)::int legal_status,
      count(o.registered_address)::int address, count(o.website)::int website,
      count(o.regulatory_license_number)::int licence, count(o.share_capital)::int share_capital,
      count(o.corporate_email)::int email, count(o.logo_url)::int logo
    from organizations o join entities e on e.id = o.entity_id
    where e.country = ${country}`);
  const c = cov.rows[0] as Record<string, number>;
  const orgsN = c.orgs ?? 0;
  const pct = (n: number | undefined) =>
    orgsN === 0 ? "0%" : `${Math.round(((n ?? 0) / orgsN) * 100)}%`;

  const geo = await db.execute(sql`
    select coalesce(el.precision,'unlocated') p, count(distinct e.id)::int n
    from entities e left join entity_locations el on el.entity_id = e.id
    where e.country = ${country} group by 1 order by 2 desc`);

  const facts = await db.execute(sql`
    select tf.status, count(*)::int n from timeline_facts tf
    join entities e on e.id = tf.entity_id where e.country = ${country} group by 1`);

  const src = await db.execute(sql`
    select source_tier, active, count(*)::int n from sources
    where country = ${country} group by 1,2 order by 1`);

  lines.push(`## ${country}`);
  lines.push("");
  if (before !== undefined) {
    lines.push(`- entities: ${before.entities} → ${entRow.n} (${entRow.active} active)`);
  } else {
    lines.push(`- entities: ${entRow.n} (${entRow.active} active) — no before-snapshot`);
  }
  lines.push(`- classified: ${classifiedN} entities · six-class Level-1 counts (mapped spine, zeros honest):`);
  for (const [slug, label] of L1_LABELS) {
    lines.push(`    - ${label}: ${l1Counts.get(slug) ?? 0}`);
  }
  lines.push(
    `- Level-3 strategies found: ${l3Found.size > 0 ? [...l3Found].sort().join(", ") : "none yet"}`,
  );
  lines.push(
    `- field coverage (${c.orgs} orgs): legal_name ${pct(c.legal_name)} · reg-no ${pct(c.registration_no)} · LEI ${pct(c.lei)} · VAT ${pct(c.vat)} · legal_form ${pct(c.legal_form)} · status ${pct(c.legal_status)} · address ${pct(c.address)} · website ${pct(c.website)} · licence ${pct(c.licence)} · share_capital ${pct(c.share_capital)} · email ${pct(c.email)}`,
  );
  lines.push(`- logo coverage: ${pct(c.logo)}`);
  lines.push(
    `- geocode precision: ${(geo.rows as { p: string; n: number }[]).map((r) => `${r.p} ${r.n}`).join(" · ")}`,
  );
  lines.push(
    `- facts: ${(facts.rows as { status: string; n: number }[]).map((r) => `${r.status} ${r.n}`).join(" · ") || "none"}`,
  );
  lines.push(
    `- sources in DB: ${(src.rows as { source_tier: string | null; active: boolean; n: number }[]).map((r) => `${r.source_tier ?? "untiered"}${r.active ? " active" : ""} ${r.n}`).join(" · ") || "none"}`,
  );
  lines.push(
    `- ledger: ${country} $${(ledger.spent[country] ?? 0).toFixed(3)} / $${COUNTRY_CAP_USD.toFixed(2)} · cumulative $${totalSpent(ledger).toFixed(3)} / $${TOTAL_CAP_USD.toFixed(2)}`,
  );
  lines.push("");
  return lines.join("\n");
}

async function snapshotCountry(cc: string): Promise<void> {
  const country = cc.toUpperCase();
  const ledger = loadLedger();
  const ent = await db.execute(
    sql`select count(*)::int n from entities where country = ${country}`,
  );
  const facts = await db.execute(
    sql`select count(*)::int n from timeline_facts tf join entities e on e.id = tf.entity_id where e.country = ${country}`,
  );
  ledger.before[country] = {
    entities: (ent.rows[0] as { n: number }).n,
    facts: (facts.rows[0] as { n: number }).n,
    takenAt: new Date().toISOString(),
  };
  saveLedger(ledger);
  console.log(`snapshot ${country}: entities=${ledger.before[country].entities} facts=${ledger.before[country].facts}`);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("europe-depth.ts") === true;
if (isMain) {
  const cmd = process.argv[2];
  const cc = argValue("--country");
  (async () => {
    if (cmd === "ledger") {
      printLedger(loadLedger());
    } else if (cmd === "seed-sources" && cc !== undefined) {
      await seedCountrySources(cc);
    } else if (cmd === "activate" && cc !== undefined) {
      await activateCountrySources(cc);
    } else if (cmd === "report" && cc !== undefined) {
      console.log(await countryReport(cc));
    } else if (cmd === "snapshot" && cc !== undefined) {
      await snapshotCountry(cc);
    } else if (cmd === "complete" && cc !== undefined) {
      const ledger = loadLedger();
      if (!ledger.completed.includes(cc.toUpperCase())) {
        ledger.completed.push(cc.toUpperCase());
        saveLedger(ledger);
      }
      printLedger(ledger);
    } else {
      console.log("usage: europe-depth.ts ledger | seed-sources --country CC | activate --country CC | report --country CC | snapshot --country CC");
      process.exit(1);
    }
    process.exit(0);
  })().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

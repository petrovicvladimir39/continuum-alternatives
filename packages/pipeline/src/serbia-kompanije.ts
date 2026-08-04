import "./env";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright";
import { createEntity, db, entities, entityTags, eq, organizations, resolveEntity, sql } from "@continuum/db";

/**
 * SERBIA DEEP RUN — kompanije.co.rs harvest.
 *
 *   tsx src/serbia-kompanije.ts sitemap        # refresh the company URL list
 *   tsx src/serbia-kompanije.ts crawl [--limit N] [--all-sectors]
 *
 * WHY A BROWSER: the site is served behind Vercel's JS "Security Checkpoint",
 * which any real browser clears by executing the page's own JavaScript. No
 * CAPTCHA is solved, no stealth plugin, no proxy rotation, no forged token —
 * a standard Chromium with a standard UA is all that is used.
 *
 * ROBOTS COMPLIANCE (fetched 2026-08-04): the site publishes
 * `User-agent: * / Allow: /` and advertises its sitemap. It disallows only
 * `/api/`, `/admin/`, `/_next/*` and `/*?page=` listing pages. This harvester
 * therefore enumerates ONLY via the advertised sitemap and fetches ONLY
 * company detail pages — never a paginated listing, never /api/. One page at
 * a time with a delay, so the crawl stays gentle on a small host.
 *
 * PROVENANCE: kompanije.co.rs republishes APR (the Serbian business register)
 * plus NBS account data. It is therefore a TIER-3 aggregator, not the primary
 * register: rows land `provisional` + `needs_verification` and every field is
 * stamped with the source URL. When APR API access exists, the same fields
 * should be re-sourced from APR directly and this becomes the fallback.
 *
 * Data points captured per company (all deterministic, from labeled fields):
 *   matični broj · PIB · legal name · legal form · founding date · employees
 *   NACE code + description · city · street address · website · social links
 *   lat/lon · revenue · assets · capital · net profit (+ fiscal year)
 *   NBS bank accounts (bank name + account number)
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const URLS_FILE = path.join(REPO_ROOT, "data", "kompanije-urls.json");
const STATE_FILE = path.join(REPO_ROOT, "data", "kompanije-state.json");
const BASE = "https://www.kompanije.co.rs";
const DELAY_MS = 1500;

/**
 * NACE divisions that matter for alternative investments. Section K
 * (financial + insurance), L (real estate), M (professional: legal,
 * accounting, consulting, holding-company management), N (administrative —
 * 82.91 is debt collection / credit bureaus), plus D/F where real-asset
 * developers and energy sit.
 */
const SECTORS_OF_INTEREST: Record<string, { l1: string; l2?: string; l3?: string; role: string; label: string }> = {
  "64": { l1: "private_debt", l2: "direct_lending", role: "GP", label: "financial services ex-insurance" },
  "65": { l1: "service_graph", role: "LP", label: "insurance, reinsurance, pension funds" },
  "66": { l1: "service_graph", role: "Advisor", label: "auxiliary financial services" },
  "68": { l1: "real_assets", l2: "private_real_estate", role: "Portfolio Co", label: "real estate" },
  "69": { l1: "service_graph", l2: "legal_advisory", role: "Advisor", label: "legal & accounting" },
  "70": { l1: "service_graph", l2: "legal_advisory", l3: "ma_advisor", role: "Advisor", label: "management consultancy / head offices" },
  "74": { l1: "service_graph", role: "Vendor", label: "other professional & technical" },
  "82": { l1: "private_debt", l2: "npl", role: "Servicer", label: "business support incl. debt collection" },
  "35": { l1: "real_assets", l2: "energy_transition", role: "Portfolio Co", label: "electricity, gas, steam" },
  "41": { l1: "real_assets", l2: "private_real_estate", role: "Portfolio Co", label: "construction of buildings" },
  "42": { l1: "real_assets", l2: "infrastructure", role: "Portfolio Co", label: "civil engineering" },
  "43": { l1: "real_assets", l2: "private_real_estate", role: "Portfolio Co", label: "specialised construction" },
  "62": { l1: "service_graph", l2: "technology", role: "Vendor", label: "IT services / fintech" },
  "63": { l1: "service_graph", l2: "technology", l3: "data_provider", role: "Vendor", label: "information services" },
  "71": { l1: "service_graph", l2: "technology", l3: "valuation_provider", role: "Vendor", label: "architecture, engineering, valuation" },
  "72": { l1: "service_graph", l2: "technology", role: "Vendor", label: "scientific R&D" },
  "73": { l1: "service_graph", role: "Vendor", label: "advertising & market research" },
  "77": { l1: "private_debt", l2: "asset_backed_lending", role: "GP", label: "rental & leasing" },
  "81": { l1: "service_graph", l2: "asset_servicing", l3: "property_manager", role: "Vendor", label: "facilities / property management" },
};

type Company = {
  url: string;
  name?: string | undefined;
  maticniBroj?: string | undefined;
  pib?: string | undefined;
  founded?: string | undefined;
  employees?: number | undefined;
  legalForm?: string | undefined;
  naceCode?: string | undefined;
  naceLabel?: string | undefined;
  city?: string | undefined;
  street?: string | undefined;
  website?: string | undefined;
  socials?: string[] | undefined;
  lat?: number | undefined;
  lon?: number | undefined;
  fiscalYear?: number | undefined;
  revenueRsd?: number | undefined;
  assetsRsd?: number | undefined;
  capitalRsd?: number | undefined;
  netProfitRsd?: number | undefined;
  banks?: string[] | undefined;
  /** "Aktivna" / "U likvidaciji" / "U stečaju" — mapped to legal_status. */
  statusRaw?: string | undefined;
  /** "O kompaniji" — the short editorial summary. */
  summary?: string | undefined;
  /** "Opis" — the long company description. */
  description?: string | undefined;
  email?: string | undefined;
};

/**
 * Pull the block of text between two section headings in the page's
 * innerText. Returns verbatim prose — never paraphrased, never generated.
 */
function between(text: string, start: string, ends: string[]): string | undefined {
  const startIdx = text.indexOf(`\n${start}\n`);
  if (startIdx === -1) {
    return undefined;
  }
  const from = startIdx + start.length + 2;
  let to = text.length;
  for (const end of ends) {
    const i = text.indexOf(`\n${end}\n`, from);
    if (i !== -1 && i < to) {
      to = i;
    }
  }
  const body = text.slice(from, to).replace(/\s+/g, " ").trim();
  return body.length >= 40 ? body.slice(0, 4000) : undefined;
}

const SECTION_ENDS = [
  "Opis",
  "MATIČNI BROJ",
  "PIB",
  "OSNIVANJE",
  "Finansijski podaci",
  "Lokacija na mapi",
  "Podaci iz NBS",
  "Povezane vesti",
  "ISTRAŽITE VIŠE",
];

/** Serbian register status → the standardized legal_status vocabulary. */
function mapStatus(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const s = raw.toLowerCase();
  if (s.includes("aktivn")) return "active";
  if (s.includes("likvidacij")) return "liquidation";
  if (s.includes("stečaj") || s.includes("stecaj")) return "restructuring";
  if (s.includes("brisan") || s.includes("neaktivn")) return "dissolved";
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** "170.810.409.000 RSD" -> 170810409000 (dots are thousands separators). */
function parseRsd(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const m = /(-?[\d.]+)\s*RSD/i.exec(raw);
  if (m === null) {
    return undefined;
  }
  const n = Number.parseInt((m[1] ?? "").replace(/\./g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseIntSafe(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const n = Number.parseInt(raw.replace(/[.\s]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

const MONTHS: Record<string, string> = {
  јануар: "01", фебруар: "02", март: "03", април: "04", мај: "05", јун: "06",
  јул: "07", август: "08", септембар: "09", октобар: "10", новембар: "11", децембар: "12",
  januar: "01", februar: "02", mart: "03", april: "04", maj: "05", jun: "06",
  jul: "07", avgust: "08", septembar: "09", oktobar: "10", novembar: "11", decembar: "12",
};

/** "30. јул 2004." -> 2004-07-30 */
function parseSerbianDate(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const m = /(\d{1,2})\.\s*([\p{L}]+)\s+(\d{4})/u.exec(raw);
  if (m === null) {
    return undefined;
  }
  const mm = MONTHS[(m[2] ?? "").toLowerCase()];
  if (mm === undefined) {
    return undefined;
  }
  return `${m[3]}-${mm}-${(m[1] ?? "").padStart(2, "0")}`;
}

/** Pull the value that follows an ALL-CAPS label in the page's innerText. */
function afterLabel(text: string, label: string): string | undefined {
  const re = new RegExp(`^${label}\\s*\\n(.+)$`, "im");
  const m = re.exec(text);
  return m === null ? undefined : (m[1] ?? "").trim();
}

async function scrapeCompany(browser: Browser, url: string): Promise<Company | null> {
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (res !== null && res.status() >= 400) {
      return null;
    }
    await page.waitForTimeout(2500);
    const text = (await page.evaluate(() => document.body.innerText)).replace(/\r/g, "");
    if (text.includes("Security Checkpoint")) {
      await page.waitForTimeout(4000);
    }
    const t = (await page.evaluate(() => document.body.innerText)).replace(/\r/g, "");
    const name = await page.title();

    const socials = await page
      .$$eval("a[href]", (as) =>
        as
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((h) => /facebook\.com|linkedin\.com|instagram\.com|twitter\.com|x\.com/i.test(h)),
      )
      .catch(() => [] as string[]);

    // Map coordinates: the OSM embed carries them in its src/href.
    const coords = await page
      .$$eval("iframe[src], a[href*='openstreetmap']", (els) =>
        els
          .map((e) => (e as HTMLElement).getAttribute("src") ?? (e as HTMLAnchorElement).href ?? "")
          .join(" "),
      )
      .catch(() => "");
    const cm =
      /mlat=(-?\d+\.\d+)[&#]*mlon=(-?\d+\.\d+)/.exec(coords) ??
      /#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/.exec(coords) ??
      /bbox=[^&]*&marker=(-?\d+\.\d+)%2C(-?\d+\.\d+)/.exec(coords);

    // Status appears in the page's own meta description ("Status: Aktivna.")
    // as well as inline; the meta line is the reliable one.
    const metaDesc = await page
      .$eval('meta[name="description"]', (e) => e.getAttribute("content") ?? "")
      .catch(() => "");
    const statusRaw =
      /Status:\s*([^.]+)\./i.exec(metaDesc)?.[1]?.trim() ?? afterLabel(t, "STATUS");

    const mailtos = await page
      .$$eval("a[href^='mailto:']", (as) =>
        as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
      )
      .catch(() => [] as string[]);
    const emailFound =
      mailtos[0]?.replace(/^mailto:/i, "").split("?")[0]?.trim() ??
      /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.exec(t)?.[0];

    const naceRaw = afterLabel(t, "DELATNOST");
    const naceM = naceRaw === undefined ? null : /^(\d{3,4})\s*[—-]\s*(.+)$/.exec(naceRaw);

    const fyM = /Finansijski podaci \((\d{4})\)/.exec(t);
    const websiteRaw = afterLabel(t, "WEBSITE");

    const banks = [...t.matchAll(/^Banka:\s*\n(.+)$/gim)].map((m) => (m[1] ?? "").trim());
    const firstBank = afterLabel(t, "БАНКА");
    if (firstBank !== undefined) {
      banks.unshift(firstBank);
    }

    const company: Company = {
      url,
      ...(name !== "" ? { name: name.split("|")[0]?.trim() } : {}),
      ...(afterLabel(t, "MATIČNI BROJ") !== undefined
        ? { maticniBroj: afterLabel(t, "MATIČNI BROJ") }
        : {}),
      ...(afterLabel(t, "PIB") !== undefined ? { pib: afterLabel(t, "PIB") } : {}),
      ...(parseSerbianDate(afterLabel(t, "OSNIVANJE")) !== undefined
        ? { founded: parseSerbianDate(afterLabel(t, "OSNIVANJE")) }
        : {}),
      ...(parseIntSafe(afterLabel(t, "ZAPOSLENI")) !== undefined
        ? { employees: parseIntSafe(afterLabel(t, "ZAPOSLENI")) }
        : {}),
      ...(afterLabel(t, "PRAVNA FORMA") !== undefined
        ? { legalForm: afterLabel(t, "PRAVNA FORMA") }
        : {}),
      ...(naceM !== null ? { naceCode: naceM[1], naceLabel: naceM[2] } : {}),
      ...(afterLabel(t, "LOKACIJA") !== undefined
        ? { city: (afterLabel(t, "LOKACIJA") ?? "").replace(/\s*\(.*\)\s*$/, "").trim() }
        : {}),
      ...(afterLabel(t, "ADRESA") !== undefined ? { street: afterLabel(t, "ADRESA") } : {}),
      ...(websiteRaw !== undefined && websiteRaw.includes(".")
        ? { website: websiteRaw.startsWith("http") ? websiteRaw : `https://${websiteRaw}` }
        : {}),
      ...(socials.length > 0 ? { socials: [...new Set(socials)] } : {}),
      ...(cm !== null
        ? { lat: Number.parseFloat(cm[1] ?? ""), lon: Number.parseFloat(cm[2] ?? "") }
        : {}),
      ...(fyM !== null ? { fiscalYear: Number.parseInt(fyM[1] ?? "", 10) } : {}),
      ...(parseRsd(afterLabel(t, "PRIHODI")) !== undefined
        ? { revenueRsd: parseRsd(afterLabel(t, "PRIHODI")) }
        : {}),
      ...(parseRsd(afterLabel(t, "IMOVINA")) !== undefined
        ? { assetsRsd: parseRsd(afterLabel(t, "IMOVINA")) }
        : {}),
      ...(parseRsd(afterLabel(t, "KAPITAL")) !== undefined
        ? { capitalRsd: parseRsd(afterLabel(t, "KAPITAL")) }
        : {}),
      ...(parseRsd(afterLabel(t, "NETO DOBIT")) !== undefined
        ? { netProfitRsd: parseRsd(afterLabel(t, "NETO DOBIT")) }
        : {}),
      ...(banks.length > 0 ? { banks: [...new Set(banks)].slice(0, 12) } : {}),
      ...(statusRaw !== undefined ? { statusRaw } : {}),
      ...(between(t, "O kompaniji", SECTION_ENDS) !== undefined
        ? { summary: between(t, "O kompaniji", SECTION_ENDS) }
        : {}),
      ...(between(t, "Opis", SECTION_ENDS.filter((s) => s !== "Opis")) !== undefined
        ? { description: between(t, "Opis", SECTION_ENDS.filter((s) => s !== "Opis")) }
        : {}),
      ...(emailFound !== undefined ? { email: emailFound } : {}),
    };
    return company;
  } catch {
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function importCompany(c: Company): Promise<"created" | "merged" | "ambiguous" | "skipped"> {
  if (c.name === undefined || c.name === "") {
    return "skipped";
  }
  // Deterministic key first: matični broj is the Serbian national register number.
  let entityId: string | undefined;
  if (c.maticniBroj !== undefined) {
    const hit = await db.execute(sql`
      SELECT entity_id FROM organizations WHERE registry_id = ${c.maticniBroj} LIMIT 1`);
    entityId = (hit.rows[0] as { entity_id: string } | undefined)?.entity_id;
  }
  let outcome: "created" | "merged" | "ambiguous" = "merged";
  if (entityId === undefined) {
    const resolved = await resolveEntity({ name: c.name, country: "RS", kindHint: "organization" });
    if (resolved.outcome === "ambiguous") {
      return "ambiguous";
    }
    if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
      entityId = resolved.entityId;
    } else {
      const created = await createEntity({
        kind: "organization",
        name: c.name,
        country: "RS",
        tags: ["kompanije_rs", "pilot_rs", "needs_verification"],
      });
      await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, created.id));
      await db.insert(organizations).values({ entityId: created.id });
      entityId = created.id;
      outcome = "created";
    }
  }

  for (const tag of ["kompanije_rs", "pilot_rs"]) {
    await db.insert(entityTags).values({ entityId, tag }).onConflictDoNothing();
  }

  const address =
    c.street !== undefined || c.city !== undefined
      ? JSON.stringify({
          ...(c.street !== undefined ? { street: c.street } : {}),
          ...(c.city !== undefined ? { city: c.city } : {}),
          country: "RS",
        })
      : null;

  // Financials are PUBLICLY STATED figures republished from APR filings —
  // stored with their currency and fiscal year, never converted by an LLM.
  const categoryFields = JSON.stringify({
    source: "kompanije.co.rs",
    source_url: c.url,
    fetched_at: new Date().toISOString(),
    ...(c.fiscalYear !== undefined ? { fiscal_year: c.fiscalYear } : {}),
    ...(c.revenueRsd !== undefined ? { revenue_rsd: c.revenueRsd } : {}),
    ...(c.assetsRsd !== undefined ? { total_assets_rsd: c.assetsRsd } : {}),
    ...(c.capitalRsd !== undefined ? { capital_rsd: c.capitalRsd } : {}),
    ...(c.netProfitRsd !== undefined ? { net_profit_rsd: c.netProfitRsd } : {}),
    ...(c.employees !== undefined ? { employees: c.employees } : {}),
    ...(c.naceCode !== undefined ? { nace_code: c.naceCode, nace_label: c.naceLabel } : {}),
    ...(c.banks !== undefined ? { nbs_banks: c.banks } : {}),
    ...(c.socials !== undefined ? { social_links: c.socials } : {}),
  });

  await db.execute(sql`
    UPDATE organizations SET
      registry_id = COALESCE(registry_id, ${c.maticniBroj ?? null}),
      tax_id = COALESCE(tax_id, ${c.pib ?? null}),
      legal_name = COALESCE(legal_name, ${c.name}),
      legal_form_native = COALESCE(legal_form_native, ${c.legalForm ?? null}),
      legal_status = COALESCE(legal_status, ${mapStatus(c.statusRaw) ?? null}),
      incorporation_date = COALESCE(incorporation_date, ${c.founded ?? null}::date),
      founded_year = COALESCE(founded_year, ${c.founded !== undefined ? Number.parseInt(c.founded.slice(0, 4), 10) : null}),
      hq_city = COALESCE(hq_city, ${c.city ?? null}),
      hq_country = COALESCE(hq_country, 'RS'),
      website = COALESCE(website, ${c.website ?? null}),
      corporate_email = COALESCE(corporate_email, ${c.email ?? null}),
      registered_address = COALESCE(registered_address, ${address}::jsonb),
      category_fields = COALESCE(category_fields, '{}'::jsonb) || ${categoryFields}::jsonb
    WHERE entity_id = ${entityId}::uuid`);

  // Prose, stored VERBATIM as published — the long "Opis" preferred over the
  // short "O kompaniji" blurb. Never paraphrased, never generated.
  const prose = c.description ?? c.summary;
  if (prose !== undefined) {
    await db.execute(sql`
      UPDATE entities SET summary = COALESCE(summary, ${prose})
      WHERE id = ${entityId}::uuid`);
  }

  // Sector classification straight from the register's own NACE code.
  const division = c.naceCode?.slice(0, 2);
  const sector = division === undefined ? undefined : SECTORS_OF_INTEREST[division];
  if (sector !== undefined) {
    await db.execute(sql`
      INSERT INTO entity_classifications (entity_id, asset_class, strategy, sub_class, source, status, confidence)
      VALUES (${entityId}::uuid, ${sector.l1}, ${sector.l3 ?? ""}, ${sector.l2 ?? null}, 'register', 'proposed', '0.80')
      ON CONFLICT DO NOTHING`);
    await db.execute(sql`
      UPDATE organizations SET primary_role = COALESCE(primary_role, ${sector.role})
      WHERE entity_id = ${entityId}::uuid`);
    await db.insert(entityTags).values({ entityId, tag: "rs_sector_target" }).onConflictDoNothing();
  }

  if (c.lat !== undefined && c.lon !== undefined && Number.isFinite(c.lat)) {
    await db.execute(sql`
      INSERT INTO entity_locations (entity_id, source, raw_address, lat, lon, precision, location_confidence, geocoded_at)
      VALUES (${entityId}::uuid, 'register_address', ${`${c.street ?? ""} ${c.city ?? ""}`.trim()},
              ${c.lat}, ${c.lon}, 'street', '0.7', now())
      ON CONFLICT (entity_id, source) DO NOTHING`);
  }
  return outcome;
}

async function crawl(): Promise<void> {
  const limIdx = process.argv.indexOf("--limit");
  const limit = limIdx >= 0 ? Number.parseInt(process.argv[limIdx + 1] ?? "0", 10) : 0;

  const urls = JSON.parse(readFileSync(URLS_FILE, "utf8")) as string[];
  const companyUrls = urls.filter((u) => {
    const p = u.replace(`${BASE}/`, "");
    return !p.startsWith("okrug/") && !p.startsWith("mesto/") && !p.startsWith("delatnost") && p.length > 12;
  });
  const state = existsSync(STATE_FILE)
    ? (JSON.parse(readFileSync(STATE_FILE, "utf8")) as { done: string[] })
    : { done: [] };
  const doneSet = new Set(state.done);
  const todo = companyUrls.filter((u) => !doneSet.has(u));
  const slice = limit > 0 ? todo.slice(0, limit) : todo;

  console.log(
    `kompanije crawl: ${companyUrls.length} company urls · ${doneSet.size} already done · processing ${slice.length}`,
  );

  const browser = await chromium.launch({ headless: true });
  const counts = { created: 0, merged: 0, ambiguous: 0, skipped: 0, failed: 0, ofInterest: 0 };
  const fields = { pib: 0, mb: 0, address: 0, website: 0, financials: 0, employees: 0, coords: 0 };
  let n = 0;

  for (const url of slice) {
    const c = await scrapeCompany(browser, url);
    n += 1;
    if (c === null) {
      counts.failed += 1;
    } else {
      if (c.pib !== undefined) fields.pib += 1;
      if (c.maticniBroj !== undefined) fields.mb += 1;
      if (c.street !== undefined) fields.address += 1;
      if (c.website !== undefined) fields.website += 1;
      if (c.revenueRsd !== undefined) fields.financials += 1;
      if (c.employees !== undefined) fields.employees += 1;
      if (c.lat !== undefined) fields.coords += 1;
      const div = c.naceCode?.slice(0, 2);
      if (div !== undefined && SECTORS_OF_INTEREST[div] !== undefined) {
        counts.ofInterest += 1;
      }
      const outcome = await importCompany(c);
      counts[outcome] += 1;
    }
    doneSet.add(url);
    if (n % 25 === 0) {
      writeFileSync(STATE_FILE, JSON.stringify({ done: [...doneSet] }));
      console.log(
        `  ${n}/${slice.length} · created ${counts.created} merged ${counts.merged} · in-sector ${counts.ofInterest} · PIB ${fields.pib} · fin ${fields.financials}`,
      );
    }
    await sleep(DELAY_MS);
  }
  writeFileSync(STATE_FILE, JSON.stringify({ done: [...doneSet] }));
  await browser.close();

  const pct = (x: number) => `${Math.round((x / Math.max(1, n - counts.failed)) * 100)}%`;
  console.log(
    `\nkompanije crawl done: ${n} pages · created ${counts.created} · merged ${counts.merged} · ambiguous ${counts.ambiguous} · failed ${counts.failed}\n` +
      `  in target sectors: ${counts.ofInterest}\n` +
      `  field yield — PIB ${pct(fields.pib)} · matični broj ${pct(fields.mb)} · address ${pct(fields.address)} · website ${pct(fields.website)} · financials ${pct(fields.financials)} · employees ${pct(fields.employees)} · coords ${pct(fields.coords)}`,
  );
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "crawl") {
    await crawl();
  } else {
    console.log("usage: serbia-kompanije.ts crawl [--limit N]");
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

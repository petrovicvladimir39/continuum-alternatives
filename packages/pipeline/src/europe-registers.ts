import "./env";
import { createInterface } from "node:readline";
import { createReadStream, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, entityClassifications, RegisterImporter, sql, type RegisterRow } from "@continuum/db";
import { splitLine } from "./registers";

/**
 * EUROPE DEPTH RUN — Step-2 register adapters ($0 deterministic), one file
 * for the run's national-register harvesters. Doctrine identical to
 * registers-harvest.ts: RegisterImporter dedup law, register rows ACTIVATE,
 * every schema field the source exposes is captured (RegisterRow.depth),
 * mechanical relevance filters only. NO ROW CAPS (operator directive
 * 2026-08-04) — the storage guard is the only bound, and every adapter is
 * idempotent so an interrupted sweep resumes on re-run.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/europe-registers.ts --register gbch
 *
 * gbch — Companies House Free Company Data (monthly bulk CSV, ~5.7M rows).
 *   Extract first:  data/europe-depth/downloads/ch-bulk/*.csv
 *   Mechanical SIC-code buckets (UK SIC 2007), every match taken (~43.8k).
 *   64205 (financial holdcos) deliberately EXCLUDED: six-figure count of
 *   shelf/holding vehicles, no alternatives signal — recorded honestly.
 * frpsan — AMF PSAN/CASP whitelist (data.gouv CSV), all active licensees.
 * nldnb — DNB complete public register (daily CSV), ALL sub-registers.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type SicBucket = {
  sic: string;
  l1: string;
  l2?: string;
  l3?: string;
  role?: string;
};

/**
 * UNCAPPED (operator directive 2026-08-04: "don't cap on entities allowed to
 * be drawn into database, include as many as you can find"). Every ACTIVE
 * company whose SIC falls in an alternatives-relevant bucket is taken —
 * ~43,800 rows in the 2026-08 file. The ONLY bound is the storage guard
 * (400 MB soft ceiling, checked every STORAGE_CHECK_EVERY rows), which stops
 * the run cleanly and reports the remainder. Runs are idempotent: a re-run
 * short-circuits known registryIds, so an interrupted sweep simply resumes.
 */
const GB_SIC_BUCKETS: SicBucket[] = [
  { sic: "64303", l1: "pe_growth", l2: "venture_capital", role: "GP" }, // venture & development capital
  { sic: "66300", l1: "liquid_alts", role: "ManCo" }, // fund management
  { sic: "64301", l1: "liquid_alts", role: "Fund Vehicle" }, // investment trusts
  { sic: "64302", l1: "liquid_alts", role: "Fund Vehicle" }, // unit trusts
  { sic: "64304", l1: "liquid_alts", role: "Fund Vehicle" }, // OEICs
  { sic: "64305", l1: "real_assets", l2: "private_real_estate", role: "Fund Vehicle" }, // property unit trusts
  { sic: "64306", l1: "real_assets", l2: "private_real_estate", role: "Fund Vehicle" }, // REITs
  { sic: "82911", l1: "private_debt", l2: "npl", role: "Servicer" }, // collection agencies
  { sic: "64921", l1: "private_debt", l2: "direct_lending", role: "GP" }, // non-deposit credit
  { sic: "64922", l1: "private_debt", l2: "asset_backed_lending", l3: "real_estate_debt", role: "GP" }, // mortgage finance
  { sic: "64991", l1: "liquid_alts", role: "ManCo" }, // security dealing on own account
  { sic: "66110", l1: "service_graph", role: "Vendor" }, // administration of financial markets
  { sic: "66190", l1: "service_graph", role: "Vendor" }, // auxiliary to financial intermediation
];

const STORAGE_CHECK_EVERY = 500;
const SOFT_CEILING_MB = 400;

/** True when the DB is at/over the soft ceiling — callers stop cleanly. */
async function atStorageCeiling(): Promise<boolean> {
  const rows = await db.execute(
    sql`select pg_database_size(current_database())::bigint as bytes`,
  );
  const mb = Number((rows.rows[0] as { bytes: string }).bytes) / (1024 * 1024);
  if (mb >= SOFT_CEILING_MB) {
    console.error(`STORAGE GUARD: ${mb.toFixed(1)} MB >= ${SOFT_CEILING_MB} MB — stopping cleanly`);
    return true;
  }
  return false;
}

const GB_LEGAL_FORM_STD: [RegExp, string][] = [
  [/limited liability partnership/i, "partnership"],
  [/limited partnership/i, "partnership"],
  [/plc|public limited/i, "corp"],
  [/private limited|ltd/i, "corp"],
  [/community interest/i, "other"],
  [/royal charter|registered society|industrial/i, "other"],
];

function gbLegalFormStd(category: string): string {
  for (const [re, std] of GB_LEGAL_FORM_STD) {
    if (re.test(category)) {
      return std;
    }
  }
  return "other";
}

async function harvestGbCompaniesHouse(): Promise<void> {
  const dir = path.join(REPO_ROOT, "data", "europe-depth", "downloads", "ch-bulk");
  if (!existsSync(dir)) {
    console.error(`extract the zip first: ${dir} missing`);
    process.exit(1);
  }
  const csv = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".csv"));
  if (csv === undefined) {
    console.error("no CSV inside ch-bulk/");
    process.exit(1);
  }
  const file = path.join(dir, csv);
  console.log(`gbch: streaming ${csv} (SIC buckets, UNCAPPED)`);

  const taken = new Map<string, number>();
  const picked: { row: RegisterRow; bucket: SicBucket }[] = [];
  let header: string[] = [];
  let col: Record<string, number> = {};
  let lines = 0;

  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    lines += 1;
    if (lines === 1) {
      header = splitLine(line, ",").map((h) => h.trim());
      col = Object.fromEntries(header.map((h, i) => [h, i]));
      continue;
    }
    const cells = splitLine(line, ",");
    const status = cells[col["CompanyStatus"] ?? -1] ?? "";
    if (status !== "Active") {
      continue;
    }
    const sics = [
      cells[col["SICCode.SicText_1"] ?? -1] ?? "",
      cells[col["SICCode.SicText_2"] ?? -1] ?? "",
      cells[col["SICCode.SicText_3"] ?? -1] ?? "",
      cells[col["SICCode.SicText_4"] ?? -1] ?? "",
    ];
    const bucket = GB_SIC_BUCKETS.find((b) => sics.some((s) => s.startsWith(b.sic)));
    if (bucket === undefined) {
      continue;
    }
    const already = taken.get(bucket.sic) ?? 0;
    const name = cells[col["CompanyName"] ?? -1] ?? "";
    const number = cells[col["CompanyNumber"] ?? -1] ?? "";
    if (name === "" || number === "") {
      continue;
    }
    taken.set(bucket.sic, already + 1);
    const street = [cells[col["RegAddress.AddressLine1"] ?? -1], cells[col["RegAddress.AddressLine2"] ?? -1]]
      .filter((s) => s !== undefined && s !== "")
      .join(", ");
    const city = cells[col["RegAddress.PostTown"] ?? -1] ?? "";
    const postal = cells[col["RegAddress.PostCode"] ?? -1] ?? "";
    const category = cells[col["CompanyCategory"] ?? -1] ?? "";
    const incorporated = cells[col["IncorporationDate"] ?? -1] ?? "";
    const uri = cells[col["URI"] ?? -1] ?? "";
    const row: RegisterRow = {
      name,
      country: "GB",
      city: city || null,
      registryId: `GBCH:${number}`,
      tags: ["register_verified", "gbch"],
      note: `Companies House ${number} · SIC ${bucket.sic} · ${category || "?"}`,
      depth: {
        legalName: name,
        legalFormNative: category || "",
        legalFormStandardized: gbLegalFormStd(category),
        legalStatus: "active",
        ...(incorporated !== "" ? { incorporationDate: toIsoDate(incorporated) } : {}),
        registeredAddress: {
          ...(street !== "" ? { street } : {}),
          ...(city !== "" ? { city } : {}),
          ...(postal !== "" ? { postal } : {}),
          country: "GB",
        },
        hqCountry: "GB",
        regulatoryStatus: "unregulated", // register grade; FCA licence layer is a separate source
        primaryRegulator: "Companies House",
        ...(bucket.role !== undefined ? { primaryRole: bucket.role } : {}),
      },
      ...(uri !== "" ? {} : {}),
    };
    picked.push({ row, bucket });
  }
  rl.close();
  console.log(
    `gbch: scanned ${lines.toLocaleString()} lines · picked ${picked.length} (` +
      GB_SIC_BUCKETS.map((b) => `${b.sic}:${taken.get(b.sic) ?? 0}`).join(" ") +
      ")",
  );

  const importer = new RegisterImporter();
  await importer.init();
  let processed = 0;
  let stopped = false;
  for (const { row } of picked) {
    if (processed % STORAGE_CHECK_EVERY === 0 && processed > 0) {
      await importer.flush();
      if (await atStorageCeiling()) {
        stopped = true;
        break;
      }
      console.log(
        `  gbch progress ${processed}/${picked.length} · created ${importer.counts.created} · ambiguous ${importer.counts.ambiguous}`,
      );
    }
    await importer.importRow(row);
    processed += 1;
  }
  await importer.flush();
  // Classifications are stamped after flush(), when every created row has an
  // id in the importer's registry map.
  let classifications = 0;
  for (const { row, bucket } of picked.slice(0, processed)) {
    const id = row.registryId == null ? undefined : importer.entityIdFor(row.registryId);
    if (id === undefined) {
      continue;
    }
    const inserted = await db
      .insert(entityClassifications)
      .values({
        entityId: id,
        assetClass: bucket.l1,
        strategy: bucket.l3 ?? "",
        subClass: bucket.l2 ?? null,
        source: "register",
        status: "proposed",
        confidence: "0.90",
      })
      .onConflictDoNothing()
      .returning({ e: entityClassifications.entityId });
    classifications += inserted.length;
  }
  console.log(
    `gbch import: processed ${processed}/${picked.length}${stopped ? " (STOPPED at storage ceiling)" : ""} · created ${importer.counts.created} · merged ${importer.counts.merged + importer.counts.merged_registry} · ambiguous skipped ${importer.counts.ambiguous} · invalid ${importer.counts.skipped} · classifications ${classifications}`,
  );
  if (importer.ambiguousRows.length > 0) {
    console.log(`ambiguous sample: ${importer.ambiguousRows.slice(0, 5).join(" | ")}`);
  }
}

/** Companies House dates are DD/MM/YYYY. */
function toIsoDate(d: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
  return m === null ? d : `${m[3]}-${m[2]}-${m[1]}`;
}

// ── FR: AMF PSAN/CASP whitelist (crypto-asset service providers) ────────────

const PSAN_DATASET_API =
  "https://www.data.gouv.fr/api/1/datasets/?q=PSAN+prestataires+actifs+numeriques&page_size=1";

const FR_COUNTRY_NAMES: Record<string, string> = {
  france: "FR", allemagne: "DE", "royaume-uni": "GB", irlande: "IE", luxembourg: "LU",
  belgique: "BE", "pays-bas": "NL", espagne: "ES", italie: "IT", portugal: "PT",
  suisse: "CH", autriche: "AT", malte: "MT", chypre: "CY", lituanie: "LT",
  estonie: "EE", lettonie: "LV", pologne: "PL",
};

/** FR VAT number derives deterministically from SIREN (statutory formula). */
function frVatFromSiren(siren: string): string | undefined {
  if (!/^\d{9}$/.test(siren)) {
    return undefined;
  }
  const key = (12 + 3 * (Number.parseInt(siren, 10) % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${siren}`;
}

async function harvestFrPsan(): Promise<void> {
  const meta = (await (await fetch(PSAN_DATASET_API, { headers: { "user-agent": "ContinuumBot/0.1" } })).json()) as {
    data?: { resources?: { format: string; url: string }[] }[];
  };
  const csvUrl = meta.data?.[0]?.resources?.find((r) => r.format === "csv")?.url;
  if (csvUrl === undefined) {
    console.error("frpsan: no CSV resource on the data.gouv dataset");
    process.exit(1);
  }
  console.log(`frpsan: ${csvUrl}`);
  const text = await (await fetch(csvUrl, { headers: { "user-agent": "ContinuumBot/0.1" } })).text();
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const header = splitLine(lines[0] ?? "", ";").map((h) => h.replace(/"/g, ""));
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const cell = (cells: string[], name: string) => (cells[col[name] ?? -1] ?? "").replace(/^"|"$/g, "").trim();

  const byAmfNo = new Map<string, RegisterRow>();
  let radiated = 0;
  for (const line of lines.slice(1)) {
    if (line.trim() === "") {
      continue;
    }
    const cells = splitLine(line, ";");
    const no = cell(cells, "no_amf");
    const name = cell(cells, "entite_nom");
    if (no === "" || name === "" || byAmfNo.has(no)) {
      if (byAmfNo.has(no)) continue;
      continue;
    }
    if (cell(cells, "statut").toLowerCase() === "radié") {
      radiated += 1;
      continue;
    }
    const lei = cell(cells, "lei");
    const siren = cell(cells, "no_registre_national");
    const country = FR_COUNTRY_NAMES[cell(cells, "pays_siege").toLowerCase()] ?? "FR";
    const vat = frVatFromSiren(siren);
    byAmfNo.set(no, {
      name,
      country,
      website: cell(cells, "site_internet") || null,
      registryId: lei !== "" ? lei : `AMF:${no}`,
      tags: ["register_verified", "amf_psan"],
      note: `AMF PSAN/CASP ${no} · ${cell(cells, "nature_autorisation")} since ${cell(cells, "date_debut_autorisation")}`,
      depth: {
        legalName: name,
        ...(cell(cells, "forme_juridique") !== "" ? { legalFormNative: cell(cells, "forme_juridique") } : {}),
        legalStatus: "active",
        regulatoryStatus: "regulated",
        primaryRegulator: "AMF",
        regulatoryLicenseNumber: no,
        ...(lei !== "" ? { leiCode: lei } : {}),
        ...(vat !== undefined ? { taxId: vat } : {}),
        ...(cell(cells, "email") !== "" ? { corporateEmail: cell(cells, "email") } : {}),
        ...(cell(cells, "telephone") !== "" ? { corporatePhone: cell(cells, "telephone") } : {}),
        hqCountry: country,
        primaryRole: "Vendor",
      },
    });
  }
  console.log(`frpsan: ${byAmfNo.size} active licensees (+${radiated} radiés skipped mechanically)`);

  const importer = new RegisterImporter();
  await importer.init();
  const rows = [...byAmfNo.values()];
  for (const row of rows) {
    await importer.importRow(row);
  }
  await importer.flush();
  let classifications = 0;
  for (const row of rows) {
    const id = row.registryId == null ? undefined : importer.entityIdFor(row.registryId);
    if (id === undefined) {
      continue;
    }
    const inserted = await db
      .insert(entityClassifications)
      .values({
        entityId: id,
        assetClass: "niche_alts",
        strategy: "",
        subClass: "digital_assets",
        source: "register",
        status: "proposed",
        confidence: "0.90",
      })
      .onConflictDoNothing()
      .returning({ e: entityClassifications.entityId });
    classifications += inserted.length;
  }
  console.log(
    `frpsan import: created ${importer.counts.created} · merged ${importer.counts.merged + importer.counts.merged_registry} · ambiguous skipped ${importer.counts.ambiguous} · classifications ${classifications}`,
  );
}

// ── NL: DNB complete public register (daily CSV, all sub-registers) ─────────

const DNB_CSV_URL = "https://www.dnb.nl/en-GB/registerdownloadcomplete/TheNetherlands/csv";

/**
 * Deelregister -> classification (null = imported but left honestly
 * UNCLASSIFIED rather than force-fit). ALL sub-registers are taken — the
 * whole DNB-supervised universe, per the no-cap directive.
 */
const DNB_REGISTERS: Record<string, { l1: string; l2?: string; role: string } | null> = {
  Pensioenfondsen: { l1: "service_graph", role: "LP" },
  "Premiepensioen instellingen": { l1: "service_graph", role: "LP" },
  Trustkantoren: { l1: "service_graph", l2: "fund_administration", role: "Vendor" },
  Verzekeraars: { l1: "service_graph", role: "LP" },
  Herverzekeraars: { l1: "service_graph", role: "LP" },
  "Actuariële organisaties": { l1: "service_graph", role: "Vendor" },
  Clearinginstellingen: { l1: "service_graph", l2: "asset_servicing", role: "Vendor" },
  Afwikkelondernemingen: { l1: "service_graph", l2: "asset_servicing", role: "Vendor" },
  Betaalinstellingen: { l1: "service_graph", l2: "technology", role: "Vendor" },
  Elektronischgeldinstellingen: { l1: "service_graph", l2: "technology", role: "Vendor" },
  Rekeninginformatiedienstverleners: { l1: "service_graph", l2: "technology", role: "Vendor" },
  Wisselinstellingen: { l1: "service_graph", l2: "technology", role: "Vendor" },
  Banken: null, // ecosystem perimeter — imported, deliberately unclassified
  Depositogarantiestelsel: null, // deposit-guarantee membership, not a role
  "Gedekte obligaties": null, // covered-bond programmes, issuer-level only
};

async function harvestNlDnb(): Promise<void> {
  console.log(`nldnb: downloading ${DNB_CSV_URL}`);
  const res = await fetch(DNB_CSV_URL, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ContinuumBot/1.0 (+https://continuumalternatives.com)" },
  });
  if (!res.ok) {
    throw new Error(`DNB download failed: HTTP ${res.status}`);
  }
  const text = await res.text();
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const header = splitLine(lines[0] ?? "", ";").map((h) => h.replace(/"/g, ""));
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const cell = (cells: string[], name: string) => (cells[col[name] ?? -1] ?? "").replace(/^"|"$/g, "").trim();

  // One row per (register × entity × permission) — dedupe on Relatienummer,
  // keeping the highest-priority Deelregister row per entity.
  const priority = Object.keys(DNB_REGISTERS);
  const best = new Map<string, { row: RegisterRow; register: string }>();
  for (const line of lines.slice(1)) {
    if (line.trim() === "") {
      continue;
    }
    const cells = splitLine(line, ";");
    const register = cell(cells, "Deelregister");
    if (!(register in DNB_REGISTERS)) {
      continue;
    }
    const rel = cell(cells, "Relatienummer");
    const name = cell(cells, "StatutaireNaam");
    if (rel === "" || name === "") {
      continue;
    }
    const kvk = cell(cells, "KvK");
    const landCode = cell(cells, "LandCodeVestiging");
    // NL presence only: a KvK number or an NL establishment address.
    if (kvk === "" && landCode !== "NL") {
      continue;
    }
    const existing = best.get(rel);
    if (existing !== undefined && priority.indexOf(existing.register) <= priority.indexOf(register)) {
      continue;
    }
    const lei = cell(cells, "LEI");
    const street = cell(cells, "AdresVestiging");
    const postal = cell(cells, "PostcodeVestiging");
    const city = cell(cells, "PlaatsVestiging");
    const inLiquidation = cell(cells, "Inliquidatie").toLowerCase() === "ja";
    const cls = DNB_REGISTERS[register];
    best.set(rel, {
      register,
      row: {
        name,
        country: "NL",
        city: city || null,
        registryId: lei !== "" ? lei : kvk !== "" ? `NLKVK:${kvk}` : `DNB:${rel}`,
        tags: ["register_verified", "dnb"],
        note: `DNB ${register} · ${cell(cells, "RegistratieType")} · ${cell(cells, "Wetsartikel").slice(0, 80)}`,
        depth: {
          legalName: name,
          legalStatus: inLiquidation ? "liquidation" : "active",
          regulatoryStatus: "regulated",
          primaryRegulator: "De Nederlandsche Bank",
          ...(lei !== "" ? { leiCode: lei } : {}),
          registeredAddress: {
            ...(street !== "" ? { street } : {}),
            ...(city !== "" ? { city } : {}),
            ...(postal !== "" ? { postal } : {}),
            country: "NL",
          },
          hqCountry: "NL",
          ...(cls != null ? { primaryRole: cls.role } : {}),
        },
      },
    });
  }
  const byRegister = new Map<string, number>();
  for (const { register } of best.values()) {
    byRegister.set(register, (byRegister.get(register) ?? 0) + 1);
  }
  console.log(
    `nldnb: ${best.size} unique entities (` +
      [...byRegister.entries()].map(([k, v]) => `${k}:${v}`).join(" ") +
      ")",
  );

  const importer = new RegisterImporter();
  await importer.init();
  let done = 0;
  for (const { row } of best.values()) {
    if (done % STORAGE_CHECK_EVERY === 0 && done > 0) {
      await importer.flush();
      if (await atStorageCeiling()) {
        break;
      }
      console.log(`  nldnb progress ${done}/${best.size} · created ${importer.counts.created}`);
    }
    await importer.importRow(row);
    done += 1;
  }
  await importer.flush();
  let classifications = 0;
  for (const { row, register } of best.values()) {
    const cls = DNB_REGISTERS[register];
    if (cls === null || cls === undefined) {
      continue;
    }
    const id = row.registryId == null ? undefined : importer.entityIdFor(row.registryId);
    if (id === undefined) {
      continue;
    }
    const inserted = await db
      .insert(entityClassifications)
      .values({
        entityId: id,
        assetClass: cls.l1,
        strategy: "",
        subClass: cls.l2 ?? null,
        source: "register",
        status: "proposed",
        confidence: "0.90",
      })
      .onConflictDoNothing()
      .returning({ e: entityClassifications.entityId });
    classifications += inserted.length;
  }
  console.log(
    `nldnb import: created ${importer.counts.created} · merged ${importer.counts.merged + importer.counts.merged_registry} · ambiguous skipped ${importer.counts.ambiguous} · classifications ${classifications}`,
  );
}

const ADAPTERS: Record<string, () => Promise<void>> = {
  gbch: harvestGbCompaniesHouse,
  frpsan: harvestFrPsan,
  nldnb: harvestNlDnb,
};

const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("europe-registers.ts") === true;
if (isMain) {
  const idx = process.argv.indexOf("--register");
  const key = idx >= 0 ? process.argv[idx + 1] : undefined;
  const adapter = key === undefined ? undefined : ADAPTERS[key];
  if (adapter === undefined) {
    console.error(`usage: europe-registers.ts --register <${Object.keys(ADAPTERS).join("|")}>`);
    process.exit(1);
  }
  adapter()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

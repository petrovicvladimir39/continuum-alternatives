import "./env";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { db, sql } from "@continuum/db";

/**
 * SERBIA DEEP RUN — the deliverable workbook.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-export.ts
 *
 * exports/serbia/continuum-serbia.xlsx with four sheets:
 *   Target sectors — companies whose NACE division matches the alternative-
 *                    investment world (the sheet to actually work from)
 *   All entities   — every Serbian record in the corpus
 *   Coverage       — per-column fill %, computed separately for the target
 *                    sheet and the full set, so gaps are visible
 *   Sources        — the Serbian sources and their tier
 *
 * Every kompanije.co.rs data point is flattened into a REAL COLUMN (revenue,
 * assets, capital, net profit, employees, NACE, banks, socials) rather than
 * left inside JSON, so the file is sortable and filterable in Excel.
 *
 * Empty cell = the source never stated it. Nothing is guessed or estimated.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = path.join(REPO_ROOT, "exports", "serbia", "continuum-serbia.xlsx");

/** NACE divisions that define the alternative-investment perimeter. */
const TARGET_DIVISIONS = [
  "64", "65", "66", "68", "69", "70", "71", "72", "73", "74",
  "77", "81", "82", "35", "41", "42", "43", "62", "63",
];

const COLUMNS: { header: string; key: string; width: number }[] = [
  // identity
  { header: "name", key: "name", width: 46 },
  { header: "legal_name", key: "legal_name", width: 46 },
  { header: "maticni_broj", key: "registry_id", width: 16 },
  { header: "PIB", key: "tax_id", width: 14 },
  { header: "lei_code", key: "lei_code", width: 22 },
  { header: "legal_form", key: "legal_form_native", width: 34 },
  { header: "legal_status", key: "legal_status", width: 14 },
  { header: "incorporation_date", key: "incorporation_date", width: 16 },
  { header: "founded_year", key: "founded_year", width: 12 },
  { header: "record_status", key: "record_status", width: 14 },
  // sector / taxonomy
  { header: "nace_code", key: "nace_code", width: 11 },
  { header: "nace_label", key: "nace_label", width: 52 },
  { header: "l1_asset_class", key: "l1", width: 18 },
  { header: "l2_sub_class", key: "l2", width: 22 },
  { header: "l3_strategy", key: "l3", width: 22 },
  { header: "primary_role", key: "primary_role", width: 15 },
  { header: "classification_status", key: "cls_status", width: 18 },
  // contact / location
  { header: "website", key: "website", width: 36 },
  { header: "corporate_email", key: "corporate_email", width: 30 },
  { header: "corporate_phone", key: "corporate_phone", width: 20 },
  { header: "address_street", key: "address_street", width: 36 },
  { header: "city", key: "hq_city", width: 20 },
  { header: "lat", key: "lat", width: 11 },
  { header: "lon", key: "lon", width: 11 },
  { header: "location_precision", key: "location_precision", width: 16 },
  // financials (publicly filed, RSD, verbatim)
  { header: "fiscal_year", key: "fiscal_year", width: 11 },
  { header: "revenue_rsd", key: "revenue_rsd", width: 20 },
  { header: "total_assets_rsd", key: "total_assets_rsd", width: 20 },
  { header: "capital_rsd", key: "capital_rsd", width: 20 },
  { header: "net_profit_rsd", key: "net_profit_rsd", width: 20 },
  { header: "employees", key: "employees", width: 12 },
  // graph / media / prose
  { header: "nbs_banks", key: "nbs_banks", width: 40 },
  { header: "social_links", key: "social_links", width: 40 },
  { header: "logo_url", key: "logo_url", width: 34 },
  { header: "summary_description", key: "summary", width: 90 },
  { header: "tags", key: "tags", width: 40 },
  // provenance
  { header: "source_url", key: "source_url", width: 46 },
  { header: "source_fetched_at", key: "source_fetched_at", width: 22 },
  { header: "verification_note", key: "verification_note", width: 44 },
  { header: "entity_id", key: "entity_id", width: 38 },
];

type Row = Record<string, unknown>;

async function fetchRows(): Promise<Row[]> {
  const res = await db.execute(sql`
    SELECT
      e.id AS entity_id, e.name, e.summary, e.status AS record_status,
      o.legal_name, o.registry_id, o.tax_id, o.lei_code, o.legal_form_native,
      o.legal_status, o.incorporation_date, o.founded_year,
      o.website, o.corporate_email, o.corporate_phone, o.hq_city, o.logo_url,
      o.registered_address->>'street' AS address_street,
      o.primary_role, o.verification_note,
      o.category_fields->>'nace_code'        AS nace_code,
      o.category_fields->>'nace_label'       AS nace_label,
      o.category_fields->>'fiscal_year'      AS fiscal_year,
      o.category_fields->>'revenue_rsd'      AS revenue_rsd,
      o.category_fields->>'total_assets_rsd' AS total_assets_rsd,
      o.category_fields->>'capital_rsd'      AS capital_rsd,
      o.category_fields->>'net_profit_rsd'   AS net_profit_rsd,
      o.category_fields->>'employees'        AS employees,
      o.category_fields->>'source_url'       AS source_url,
      o.category_fields->>'fetched_at'       AS source_fetched_at,
      o.category_fields->'nbs_banks'         AS nbs_banks,
      o.category_fields->'social_links'      AS social_links,
      cls.asset_class AS l1, cls.sub_class AS l2, nullif(cls.strategy,'') AS l3,
      cls.status AS cls_status,
      loc.lat, loc.lon, loc.precision AS location_precision,
      (SELECT string_agg(t.tag, ', ' ORDER BY t.tag) FROM entity_tags t WHERE t.entity_id = e.id) AS tags
    FROM entities e
    LEFT JOIN organizations o ON o.entity_id = e.id
    LEFT JOIN LATERAL (
      SELECT ec.asset_class, ec.sub_class, ec.strategy, ec.status
      FROM entity_classifications ec WHERE ec.entity_id = e.id
      ORDER BY (ec.status = 'approved') DESC, ec.confidence DESC NULLS LAST LIMIT 1
    ) cls ON true
    LEFT JOIN LATERAL (
      SELECT el.lat, el.lon, el.precision FROM entity_locations el
      WHERE el.entity_id = e.id
      ORDER BY CASE el.precision WHEN 'rooftop' THEN 1 WHEN 'street' THEN 2 ELSE 3 END LIMIT 1
    ) loc ON true
    WHERE e.country = 'RS'
    ORDER BY (o.category_fields->>'revenue_rsd')::numeric DESC NULLS LAST, e.name
  `);
  return res.rows as Row[];
}

function toCell(v: unknown): string | number {
  if (v === null || v === undefined) {
    return "";
  }
  if (Array.isArray(v)) {
    return v.join(" | ");
  }
  return typeof v === "number" ? v : String(v);
}

const NUMERIC = new Set([
  "revenue_rsd", "total_assets_rsd", "capital_rsd", "net_profit_rsd",
  "employees", "fiscal_year", "founded_year", "lat", "lon",
]);

function addSheet(wb: ExcelJS.Workbook, title: string, rows: Row[]): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(title, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  for (const r of rows) {
    const out: Record<string, string | number> = {};
    for (const c of COLUMNS) {
      const raw = r[c.key];
      if (NUMERIC.has(c.key) && raw !== null && raw !== undefined && raw !== "") {
        const n = Number(raw);
        out[c.key] = Number.isFinite(n) ? n : toCell(raw);
      } else {
        out[c.key] = toCell(raw);
      }
    }
    ws.addRow(out);
  }
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  return ws;
}

async function main(): Promise<void> {
  const rows = await fetchRows();
  const target = rows.filter((r) => {
    const nace = r.nace_code === null || r.nace_code === undefined ? "" : String(r.nace_code);
    return TARGET_DIVISIONS.includes(nace.slice(0, 2));
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Continuum Alternatives — Serbia deep run";
  wb.created = new Date();

  addSheet(wb, "Target sectors", target);
  addSheet(wb, "All entities", rows);

  // Coverage sheet — fill % per column, target set vs everything.
  const cov = wb.addWorksheet("Coverage");
  cov.columns = [
    { header: "column", key: "column", width: 30 },
    { header: "target_filled", key: "tf", width: 14 },
    { header: "target_pct", key: "tp", width: 12 },
    { header: "all_filled", key: "af", width: 12 },
    { header: "all_pct", key: "ap", width: 10 },
  ];
  cov.getRow(1).font = { bold: true };
  const filledIn = (set: Row[], key: string) =>
    set.filter((r) => {
      const v = r[key];
      return v !== null && v !== undefined && String(v).trim() !== "";
    }).length;
  for (const c of COLUMNS) {
    const tf = filledIn(target, c.key);
    const af = filledIn(rows, c.key);
    cov.addRow({
      column: c.header,
      tf,
      tp: target.length === 0 ? "0%" : `${Math.round((tf / target.length) * 100)}%`,
      af,
      ap: rows.length === 0 ? "0%" : `${Math.round((af / rows.length) * 100)}%`,
    });
  }
  cov.addRow({});
  cov.addRow({ column: `Target-sector rows: ${target.length} of ${rows.length} Serbian records` });
  cov.addRow({ column: "Empty cell = the source never stated it. Never guessed, never estimated." });
  cov.addRow({ column: "Financials are as filed with APR, in RSD, verbatim — no FX conversion applied." });
  cov.addRow({ column: "record_status 'provisional' + proposed classifications are REVIEW-GATED, not published." });

  const srcs = await db.execute(sql`
    SELECT name, url, source_type::text AS source_type, source_tier::text AS tier,
           fetch_method, active
    FROM sources WHERE country = 'RS' ORDER BY tier, name`);
  const ss = wb.addWorksheet("Sources");
  ss.columns = [
    { header: "name", key: "name", width: 46 },
    { header: "url", key: "url", width: 56 },
    { header: "type", key: "source_type", width: 16 },
    { header: "tier", key: "tier", width: 24 },
    { header: "fetch_method", key: "fetch_method", width: 18 },
    { header: "active", key: "active", width: 10 },
  ];
  ss.getRow(1).font = { bold: true };
  for (const s of srcs.rows as Row[]) {
    ss.addRow({
      name: toCell(s.name),
      url: toCell(s.url),
      source_type: toCell(s.source_type),
      tier: toCell(s.tier),
      fetch_method: toCell(s.fetch_method),
      active: s.active === true ? "yes" : "no",
    });
  }

  mkdirSync(path.dirname(OUT), { recursive: true });
  // Windows locks the file while it is open in Excel; fall back to a sibling
  // name rather than losing the run.
  // Windows locks a workbook while Excel has it open. Try the canonical name,
  // then numbered siblings, so a locked file never costs a run.
  let written = "";
  for (const candidate of [
    OUT,
    ...Array.from({ length: 20 }, (_, i) => OUT.replace(/\.xlsx$/, `-v${i + 2}.xlsx`)),
  ]) {
    try {
      await wb.xlsx.writeFile(candidate);
      written = candidate;
      break;
    } catch (error) {
      if ((error as { code?: string }).code !== "EBUSY") {
        throw error;
      }
    }
  }
  if (written === "") {
    throw new Error("every candidate workbook filename is locked — close Excel and retry");
  }
  if (written !== OUT) {
    console.log(`NOTE: ${path.basename(OUT)} is open in Excel — wrote ${path.basename(written)} instead.`);
  }
  console.log(
    `serbia-export: ${rows.length} Serbian records · ${target.length} in target NACE divisions · ${COLUMNS.length} columns → ${written}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

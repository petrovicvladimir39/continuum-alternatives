import "./env";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { db, sql } from "@continuum/db";

/**
 * EUROPE DEPTH RUN — per-country Excel export (operator directive
 * 2026-08-04: a second, portable copy of everything, openable/compareable/
 * enrichable outside the platform and independent of DB storage headroom).
 *
 *   tsx src/europe-export-xlsx.ts [--country CC] [--all]
 *
 * One workbook per country in exports/europe-depth/{CC}-entities.xlsx, with:
 *   Entities   — one row per entity, EVERY stored data point (60+ columns)
 *   Facts      — timeline facts with status + source + provenance
 *   Sources    — the country's cataloged sources with tier + access method
 *   Coverage   — field-fill percentages, so gaps are visible at a glance
 *
 * $0, read-only, deterministic. Empty cells mean the source never stated the
 * value — they are NEVER filled with guesses. Review status travels with the
 * data: proposed rows are labeled, so nothing reads as published fact.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT_DIR = path.join(REPO_ROOT, "exports", "europe-depth");

/** Column order = the schema groups from the run spec, A→G. */
const ENTITY_COLUMNS: { header: string; key: string; width: number }[] = [
  // A. IDENTITY
  { header: "entity_id", key: "entity_id", width: 38 },
  { header: "slug", key: "slug", width: 28 },
  { header: "name", key: "name", width: 40 },
  { header: "legal_name", key: "legal_name", width: 40 },
  { header: "commercial_name", key: "commercial_name", width: 28 },
  { header: "kind", key: "kind", width: 12 },
  { header: "record_status", key: "record_status", width: 14 },
  { header: "national_registration_number", key: "registry_id", width: 24 },
  { header: "lei_code", key: "lei_code", width: 22 },
  { header: "vat_tax_id", key: "tax_id", width: 18 },
  { header: "legal_form_native", key: "legal_form_native", width: 22 },
  { header: "legal_form_standardized", key: "legal_form_standardized", width: 20 },
  { header: "jurisdiction_country", key: "country", width: 10 },
  { header: "incorporation_date", key: "incorporation_date", width: 16 },
  { header: "founded_year", key: "founded_year", width: 12 },
  { header: "legal_status", key: "legal_status", width: 14 },
  // B. REGULATORY & CONTACT
  { header: "regulatory_status", key: "regulatory_status", width: 16 },
  { header: "primary_regulator_name", key: "primary_regulator", width: 24 },
  { header: "regulatory_license_number", key: "regulatory_license_number", width: 20 },
  { header: "address_street", key: "address_street", width: 34 },
  { header: "address_city", key: "address_city", width: 20 },
  { header: "address_postal", key: "address_postal", width: 12 },
  { header: "address_country", key: "address_country", width: 12 },
  { header: "hq_city", key: "hq_city", width: 20 },
  { header: "hq_country", key: "hq_country", width: 10 },
  { header: "official_website_url", key: "website", width: 34 },
  { header: "corporate_email", key: "corporate_email", width: 28 },
  { header: "corporate_phone", key: "corporate_phone", width: 18 },
  // C. TAXONOMY
  { header: "l1_asset_class", key: "l1", width: 20 },
  { header: "l2_sub_class", key: "l2", width: 22 },
  { header: "l3_strategy", key: "l3", width: 24 },
  { header: "classification_status", key: "classification_status", width: 18 },
  { header: "classification_source", key: "classification_source", width: 18 },
  { header: "primary_entity_role", key: "primary_role", width: 16 },
  { header: "secondary_roles", key: "secondary_roles", width: 22 },
  { header: "target_geographic_scope", key: "target_geo_scope", width: 22 },
  { header: "tags", key: "tags", width: 40 },
  // D. FINANCIAL (only when publicly stated)
  { header: "share_capital_amount", key: "share_capital_amount", width: 18 },
  { header: "share_capital_currency", key: "share_capital_currency", width: 14 },
  { header: "share_capital_eur", key: "share_capital_eur", width: 18 },
  { header: "share_capital_rate_date", key: "share_capital_rate_date", width: 16 },
  { header: "aum_eur", key: "aum_eur", width: 18 },
  { header: "capital_raised_eur", key: "capital_raised_eur", width: 18 },
  { header: "reporting_date", key: "reporting_date", width: 14 },
  { header: "category_specific_fields", key: "category_fields", width: 40 },
  // E. GRAPH
  { header: "managed_funds_or_spvs", key: "manages", width: 40 },
  { header: "managed_by", key: "managed_by", width: 30 },
  { header: "related_entities", key: "related", width: 40 },
  { header: "edge_count", key: "edge_count", width: 12 },
  // F. MEDIA & LOCATION
  { header: "logo_url", key: "logo_url", width: 34 },
  { header: "logo_source", key: "logo_source", width: 14 },
  { header: "lat", key: "lat", width: 12 },
  { header: "lon", key: "lon", width: 12 },
  { header: "location_precision", key: "location_precision", width: 16 },
  { header: "location_confidence", key: "location_confidence", width: 16 },
  { header: "location_source", key: "location_source", width: 18 },
  // G. PROVENANCE
  { header: "primary_source_name", key: "primary_source_name", width: 30 },
  { header: "source_tier", key: "source_tier", width: 22 },
  { header: "verification_note", key: "verification_note", width: 48 },
  { header: "fact_count", key: "fact_count", width: 12 },
  { header: "proposed_fact_count", key: "proposed_fact_count", width: 18 },
  { header: "summary", key: "summary", width: 60 },
  { header: "created_at", key: "created_at", width: 22 },
  { header: "updated_at", key: "updated_at", width: 22 },
];

type Row = Record<string, unknown>;

function jsonField(value: unknown, key: string): string {
  if (value === null || value === undefined) {
    return "";
  }
  const obj = value as Record<string, unknown>;
  const v = obj[key];
  return v === null || v === undefined ? "" : String(v);
}

function listField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return Array.isArray(value) ? value.join(", ") : String(value);
}

async function exportCountry(cc: string, outFile?: string): Promise<{ entities: number; file: string }> {
  const country = cc.toUpperCase();
  const result = await db.execute(sql`
    SELECT
      e.id, e.slug, e.name, e.kind::text AS kind, e.status AS record_status,
      e.country, e.summary, e.created_at, e.updated_at,
      o.legal_name, o.commercial_name, o.registry_id, o.lei_code, o.tax_id,
      o.legal_form_native, o.legal_form_standardized, o.incorporation_date,
      o.founded_year, o.legal_status, o.regulatory_status, o.primary_regulator,
      o.regulatory_license_number, o.registered_address, o.hq_city, o.hq_country,
      o.website, o.corporate_email, o.corporate_phone, o.primary_role,
      o.secondary_roles, o.target_geo_scope, o.share_capital, o.aum_eur,
      o.capital_raised_eur, o.reporting_date, o.category_fields,
      o.logo_url, o.logo_source, o.verification_note,
      (SELECT string_agg(t.tag, ', ' ORDER BY t.tag) FROM entity_tags t WHERE t.entity_id = e.id) AS tags,
      cls.asset_class AS l1, cls.sub_class AS l2, nullif(cls.strategy,'') AS l3,
      cls.status AS classification_status, cls.source AS classification_source,
      loc.lat, loc.lon, loc.precision AS location_precision,
      loc.location_confidence, loc.source AS location_source,
      (SELECT count(*)::int FROM timeline_facts tf WHERE tf.entity_id = e.id) AS fact_count,
      (SELECT count(*)::int FROM timeline_facts tf WHERE tf.entity_id = e.id AND tf.status = 'proposed') AS proposed_fact_count,
      (SELECT count(*)::int FROM edges g WHERE g.source_entity_id = e.id OR g.target_entity_id = e.id) AS edge_count,
      (SELECT string_agg(te.name, ' | ') FROM edges g JOIN entities te ON te.id = g.target_entity_id
        WHERE g.source_entity_id = e.id AND g.edge_type = 'manages') AS manages,
      (SELECT string_agg(se.name, ' | ') FROM edges g JOIN entities se ON se.id = g.source_entity_id
        WHERE g.target_entity_id = e.id AND g.edge_type = 'manages') AS managed_by,
      (SELECT string_agg(DISTINCT oe.name, ' | ') FROM edges g
         JOIN entities oe ON oe.id = CASE WHEN g.source_entity_id = e.id THEN g.target_entity_id ELSE g.source_entity_id END
        WHERE (g.source_entity_id = e.id OR g.target_entity_id = e.id) AND g.edge_type <> 'manages') AS related
    FROM entities e
    LEFT JOIN organizations o ON o.entity_id = e.id
    LEFT JOIN LATERAL (
      SELECT ec.asset_class, ec.sub_class, ec.strategy, ec.status, ec.source
      FROM entity_classifications ec WHERE ec.entity_id = e.id
      ORDER BY (ec.status = 'approved') DESC, ec.confidence DESC NULLS LAST LIMIT 1
    ) cls ON true
    LEFT JOIN LATERAL (
      SELECT el.lat, el.lon, el.precision, el.location_confidence, el.source
      FROM entity_locations el WHERE el.entity_id = e.id
      ORDER BY CASE el.precision WHEN 'rooftop' THEN 1 WHEN 'street' THEN 2 ELSE 3 END LIMIT 1
    ) loc ON true
    WHERE e.country = ${country}
    ORDER BY e.name
  `);
  const rows = result.rows as Row[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Continuum Alternatives — EUROPE DEPTH RUN";
  wb.created = new Date();

  const ws = wb.addWorksheet("Entities", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = ENTITY_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  for (const r of rows) {
    ws.addRow({
      entity_id: r.id,
      slug: r.slug,
      name: r.name,
      legal_name: r.legal_name ?? "",
      commercial_name: r.commercial_name ?? "",
      kind: r.kind,
      record_status: r.record_status ?? "",
      registry_id: r.registry_id ?? "",
      lei_code: r.lei_code ?? "",
      tax_id: r.tax_id ?? "",
      legal_form_native: r.legal_form_native ?? "",
      legal_form_standardized: r.legal_form_standardized ?? "",
      country: r.country ?? "",
      incorporation_date: r.incorporation_date ?? "",
      founded_year: r.founded_year ?? "",
      legal_status: r.legal_status ?? "",
      regulatory_status: r.regulatory_status ?? "",
      primary_regulator: r.primary_regulator ?? "",
      regulatory_license_number: r.regulatory_license_number ?? "",
      address_street: jsonField(r.registered_address, "street"),
      address_city: jsonField(r.registered_address, "city"),
      address_postal: jsonField(r.registered_address, "postal"),
      address_country: jsonField(r.registered_address, "country"),
      hq_city: r.hq_city ?? "",
      hq_country: r.hq_country ?? "",
      website: r.website ?? "",
      corporate_email: r.corporate_email ?? "",
      corporate_phone: r.corporate_phone ?? "",
      l1: r.l1 ?? "",
      l2: r.l2 ?? "",
      l3: r.l3 ?? "",
      classification_status: r.classification_status ?? "",
      classification_source: r.classification_source ?? "",
      primary_role: r.primary_role ?? "",
      secondary_roles: listField(r.secondary_roles),
      target_geo_scope: listField(r.target_geo_scope),
      tags: r.tags ?? "",
      share_capital_amount: jsonField(r.share_capital, "amount"),
      share_capital_currency: jsonField(r.share_capital, "currency"),
      share_capital_eur: jsonField(r.share_capital, "amountEur"),
      share_capital_rate_date: jsonField(r.share_capital, "rateDate"),
      aum_eur: r.aum_eur ?? "",
      capital_raised_eur: r.capital_raised_eur ?? "",
      reporting_date: r.reporting_date ?? "",
      category_fields: r.category_fields === null || r.category_fields === undefined ? "" : JSON.stringify(r.category_fields),
      manages: r.manages ?? "",
      managed_by: r.managed_by ?? "",
      related: r.related ?? "",
      edge_count: r.edge_count ?? 0,
      logo_url: r.logo_url ?? "",
      logo_source: r.logo_source ?? "",
      lat: r.lat ?? "",
      lon: r.lon ?? "",
      location_precision: r.location_precision ?? "",
      location_confidence: r.location_confidence ?? "",
      location_source: r.location_source ?? "",
      primary_source_name: r.primary_regulator ?? "",
      source_tier: r.record_status === "active" ? "tier1_2_register_grade" : "provisional_review_gated",
      verification_note: r.verification_note ?? "",
      fact_count: r.fact_count ?? 0,
      proposed_fact_count: r.proposed_fact_count ?? 0,
      summary: r.summary ?? "",
      created_at: r.created_at === null || r.created_at === undefined ? "" : String(r.created_at),
      updated_at: r.updated_at === null || r.updated_at === undefined ? "" : String(r.updated_at),
    });
  }
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ENTITY_COLUMNS.length } };

  // ── Facts sheet ───────────────────────────────────────────────────────────
  const facts = await db.execute(sql`
    SELECT e.name AS entity, tf.fact_type, tf.status::text AS status, tf.title, tf.body,
           tf.occurred_on, tf.recorded_at, tf.confidence, tf.data::text AS data,
           d.url AS source_url, s.name AS source_name, s.source_tier::text AS source_tier
    FROM timeline_facts tf
    JOIN entities e ON e.id = tf.entity_id
    LEFT JOIN documents d ON d.id = tf.source_document_id
    LEFT JOIN sources s ON s.id = d.source_id
    WHERE e.country = ${country}
    ORDER BY tf.occurred_on DESC NULLS LAST
  `);
  const fs2 = wb.addWorksheet("Facts", { views: [{ state: "frozen", ySplit: 1 }] });
  fs2.columns = [
    { header: "entity", key: "entity", width: 40 },
    { header: "fact_type", key: "fact_type", width: 20 },
    { header: "review_status", key: "status", width: 16 },
    { header: "title", key: "title", width: 60 },
    { header: "occurred_on", key: "occurred_on", width: 14 },
    { header: "recorded_at", key: "recorded_at", width: 22 },
    { header: "confidence", key: "confidence", width: 12 },
    { header: "source_name", key: "source_name", width: 30 },
    { header: "source_tier", key: "source_tier", width: 20 },
    { header: "source_url", key: "source_url", width: 50 },
    { header: "body", key: "body", width: 70 },
    { header: "data_json", key: "data", width: 60 },
  ];
  for (const f of facts.rows as Row[]) {
    fs2.addRow({
      entity: f.entity,
      fact_type: f.fact_type,
      status: f.status,
      title: f.title ?? "",
      occurred_on: f.occurred_on === null ? "" : String(f.occurred_on),
      recorded_at: f.recorded_at === null ? "" : String(f.recorded_at),
      confidence: f.confidence ?? "",
      source_name: f.source_name ?? "",
      source_tier: f.source_tier ?? "",
      source_url: f.source_url ?? "",
      body: f.body ?? "",
      data: f.data ?? "",
    });
  }
  fs2.getRow(1).font = { bold: true };

  // ── Sources sheet ─────────────────────────────────────────────────────────
  const srcs = await db.execute(sql`
    SELECT name, url, source_type::text AS source_type, source_tier::text AS source_tier,
           fetch_method, active, last_run_status, last_run_at
    FROM sources WHERE country = ${country} ORDER BY source_tier, name
  `);
  const ss = wb.addWorksheet("Sources", { views: [{ state: "frozen", ySplit: 1 }] });
  ss.columns = [
    { header: "name", key: "name", width: 44 },
    { header: "url", key: "url", width: 56 },
    { header: "source_type", key: "source_type", width: 16 },
    { header: "source_tier", key: "source_tier", width: 24 },
    { header: "fetch_method", key: "fetch_method", width: 18 },
    { header: "active", key: "active", width: 10 },
    { header: "last_run_status", key: "last_run_status", width: 16 },
    { header: "last_run_at", key: "last_run_at", width: 22 },
  ];
  for (const s of srcs.rows as Row[]) {
    ss.addRow({
      name: s.name,
      url: s.url ?? "",
      source_type: s.source_type,
      source_tier: s.source_tier ?? "",
      fetch_method: s.fetch_method ?? "",
      active: s.active === true ? "yes" : "no",
      last_run_status: s.last_run_status ?? "",
      last_run_at: s.last_run_at === null ? "" : String(s.last_run_at),
    });
  }
  ss.getRow(1).font = { bold: true };

  // ── Coverage sheet: which columns are actually filled ─────────────────────
  const cs = wb.addWorksheet("Coverage");
  cs.columns = [
    { header: "column", key: "column", width: 34 },
    { header: "filled", key: "filled", width: 12 },
    { header: "total", key: "total", width: 12 },
    { header: "pct", key: "pct", width: 10 },
  ];
  cs.getRow(1).font = { bold: true };
  const total = rows.length;
  for (const c of ENTITY_COLUMNS) {
    let filled = 0;
    ws.eachRow((row, i) => {
      if (i === 1) {
        return;
      }
      const v = row.getCell(c.key).value;
      if (v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "0") {
        filled += 1;
      }
    });
    cs.addRow({
      column: c.header,
      filled,
      total,
      pct: total === 0 ? "0%" : `${Math.round((filled / total) * 100)}%`,
    });
  }
  cs.addRow({});
  cs.addRow({
    column: "NOTE: empty cell = the source never stated it. Never guessed, never estimated.",
  });
  cs.addRow({
    column: "record_status 'provisional' + proposed facts/classifications are REVIEW-GATED, not published.",
  });

  const file = outFile ?? path.join(OUT_DIR, `${country}-entities.xlsx`);
  mkdirSync(path.dirname(file), { recursive: true });
  await wb.xlsx.writeFile(file);
  return { entities: rows.length, file };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const ccIdx = argv.indexOf("--country");
  const all = argv.includes("--all");
  let countries: string[];
  if (all) {
    const res = await db.execute(
      sql`SELECT DISTINCT country FROM entities WHERE country IS NOT NULL ORDER BY country`,
    );
    countries = (res.rows as { country: string }[]).map((r) => r.country);
  } else {
    const cc = ccIdx >= 0 ? argv[ccIdx + 1] : undefined;
    if (cc === undefined) {
      console.error("usage: europe-export-xlsx.ts --country CC | --all");
      process.exit(1);
    }
    countries = [cc];
  }
  const outIdx = argv.indexOf("--out");
  const outFile = outIdx >= 0 ? path.resolve(REPO_ROOT, argv[outIdx + 1] ?? "") : undefined;
  let grand = 0;
  for (const cc of countries) {
    const { entities, file } = await exportCountry(cc, countries.length === 1 ? outFile : undefined);
    grand += entities;
    console.log(`  ${cc.toUpperCase()}  ${entities} entities → ${path.basename(file)}`);
  }
  console.log(
    `xlsx export: ${countries.length} workbook(s), ${grand} entity rows, ${ENTITY_COLUMNS.length} columns each → exports/europe-depth/`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

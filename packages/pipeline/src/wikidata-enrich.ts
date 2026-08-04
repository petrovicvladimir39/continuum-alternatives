import "./env";
import { db, sql } from "@continuum/db";

/**
 * EUROPE DEPTH RUN — deterministic multi-field enrichment from Wikidata,
 * joined on LEI ($0, no LLM, no guessing).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/wikidata-enrich.ts [--limit N]
 *
 * WHY LEI: Wikidata property P1278 is the Legal Entity Identifier — an exact,
 * globally unique key. Joining on it is DETERMINISTIC, unlike name matching,
 * so no fuzzy resolution and no ambiguity risk. ~53k Wikidata items carry an
 * LEI; our corpus carries 21.8k LEIs.
 *
 * Fields filled (FILL-NULL ONLY — an existing value always wins, nothing is
 * ever overwritten, nothing is invented):
 *   P856  official website     -> organizations.website
 *   P571  inception            -> organizations.incorporation_date / founded_year
 *   P1454 legal form           -> organizations.legal_form_native
 *   P17   country              -> organizations.hq_country (ISO2 via P297)
 *   P159  headquarters location-> organizations.hq_city
 *   P968  email                -> organizations.corporate_email
 *   P1329 phone                -> organizations.corporate_phone
 *   P2139 revenue / P2403 assets — deliberately NOT imported: crowd-sourced
 *         financials are not register-grade and the house rule is that
 *         monetary values come from the source that states them officially.
 *
 * Wikidata is CROWD-SOURCED: these are gap-fills onto entities that already
 * exist from register-grade sources, tagged `wikidata_enriched` so the
 * provenance is visible. No entity is ever CREATED here.
 */

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";
const BATCH = 100; // LEIs per SPARQL VALUES clause (WDQS 502s above ~150)
const RETRIES = 2;

type Enriched = {
  lei: string;
  website?: string;
  inception?: string;
  legalForm?: string;
  countryIso?: string;
  hqCity?: string;
  email?: string;
  phone?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function querySparql(leis: string[]): Promise<Enriched[]> {
  const values = leis.map((l) => `"${l}"`).join(" ");
  const query = `
SELECT ?lei ?website ?inception ?legalFormLabel ?iso ?hqLabel ?email ?phone WHERE {
  VALUES ?lei { ${values} }
  ?item wdt:P1278 ?lei .
  OPTIONAL { ?item wdt:P856 ?website }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P1454 ?legalForm }
  OPTIONAL { ?item wdt:P17 ?country . ?country wdt:P297 ?iso }
  OPTIONAL { ?item wdt:P159 ?hq }
  OPTIONAL { ?item wdt:P968 ?email }
  OPTIONAL { ?item wdt:P1329 ?phone }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,es,it,nl". }
}`;
  const response = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "user-agent": UA,
      accept: "application/sparql-results+json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`SPARQL ${response.status}`);
  }
  const json = (await response.json()) as {
    results: { bindings: Record<string, { value: string }>[] };
  };
  const byLei = new Map<string, Enriched>();
  for (const b of json.results.bindings) {
    const lei = b.lei?.value;
    if (lei === undefined) {
      continue;
    }
    const row = byLei.get(lei) ?? { lei };
    // First non-empty value wins; never overwrite within a batch either.
    if (row.website === undefined && b.website?.value !== undefined) {
      row.website = b.website.value;
    }
    if (row.inception === undefined && b.inception?.value !== undefined) {
      row.inception = b.inception.value.slice(0, 10);
    }
    if (row.legalForm === undefined && b.legalFormLabel?.value !== undefined) {
      row.legalForm = b.legalFormLabel.value;
    }
    if (row.countryIso === undefined && b.iso?.value !== undefined) {
      row.countryIso = b.iso.value.toUpperCase();
    }
    if (row.hqCity === undefined && b.hqLabel?.value !== undefined) {
      row.hqCity = b.hqLabel.value;
    }
    if (row.email === undefined && b.email?.value !== undefined) {
      row.email = b.email.value.replace(/^mailto:/, "");
    }
    if (row.phone === undefined && b.phone?.value !== undefined) {
      row.phone = b.phone.value;
    }
    byLei.set(lei, row);
  }
  return [...byLei.values()];
}

async function main(): Promise<void> {
  const limIdx = process.argv.indexOf("--limit");
  const limit = limIdx >= 0 ? Number.parseInt(process.argv[limIdx + 1] ?? "0", 10) : 0;

  // Only entities whose LEI we hold and that still have at least one gap.
  const target = await db.execute(sql`
    SELECT o.entity_id, o.lei_code
    FROM organizations o
    WHERE o.lei_code IS NOT NULL
      AND (o.website IS NULL OR o.incorporation_date IS NULL OR o.legal_form_native IS NULL
           OR o.hq_city IS NULL OR o.corporate_email IS NULL OR o.corporate_phone IS NULL)
    ORDER BY o.lei_code
    ${limit > 0 ? sql`LIMIT ${limit}` : sql``}
  `);
  const rows = target.rows as { entity_id: string; lei_code: string }[];
  const byLei = new Map(rows.map((r) => [r.lei_code, r.entity_id]));
  console.log(`wikidata-enrich: ${rows.length} LEI-bearing entities with at least one gap`);

  const filled = {
    website: 0,
    incorporation_date: 0,
    founded_year: 0,
    legal_form_native: 0,
    hq_city: 0,
    hq_country: 0,
    corporate_email: 0,
    corporate_phone: 0,
  };
  let matched = 0;
  let batches = 0;
  const leis = [...byLei.keys()];
  for (let i = 0; i < leis.length; i += BATCH) {
    const slice = leis.slice(i, i + BATCH);
    let results: Enriched[] | undefined;
    for (let attempt = 0; attempt <= RETRIES && results === undefined; attempt++) {
      try {
        results = await querySparql(slice);
      } catch (error) {
        if (attempt === RETRIES) {
          console.log(`  batch at ${i} failed after ${RETRIES + 1} tries: ${String(error).slice(0, 80)}`);
        }
        await sleep(4000 * (attempt + 1));
      }
    }
    if (results === undefined) {
      continue;
    }
    batches += 1;
    for (const r of results) {
      const entityId = byLei.get(r.lei);
      if (entityId === undefined) {
        continue;
      }
      matched += 1;
      // Each column filled only where currently NULL — a single guarded
      // UPDATE per field so an existing register value always wins.
      if (r.website !== undefined) {
        const u = await db.execute(sql`
          UPDATE organizations SET website = ${r.website}
          WHERE entity_id = ${entityId}::uuid AND website IS NULL RETURNING entity_id`);
        filled.website += u.rows.length;
      }
      if (r.inception !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(r.inception)) {
        const u = await db.execute(sql`
          UPDATE organizations SET incorporation_date = ${r.inception}::date
          WHERE entity_id = ${entityId}::uuid AND incorporation_date IS NULL RETURNING entity_id`);
        filled.incorporation_date += u.rows.length;
        const y = Number.parseInt(r.inception.slice(0, 4), 10);
        if (Number.isFinite(y) && y > 1600 && y <= new Date().getFullYear()) {
          const u2 = await db.execute(sql`
            UPDATE organizations SET founded_year = ${y}
            WHERE entity_id = ${entityId}::uuid AND founded_year IS NULL RETURNING entity_id`);
          filled.founded_year += u2.rows.length;
        }
      }
      if (r.legalForm !== undefined && r.legalForm.length <= 80) {
        const u = await db.execute(sql`
          UPDATE organizations SET legal_form_native = ${r.legalForm}
          WHERE entity_id = ${entityId}::uuid AND legal_form_native IS NULL RETURNING entity_id`);
        filled.legal_form_native += u.rows.length;
      }
      if (r.hqCity !== undefined && r.hqCity.length <= 80 && !/^Q\d+$/.test(r.hqCity)) {
        const u = await db.execute(sql`
          UPDATE organizations SET hq_city = ${r.hqCity}
          WHERE entity_id = ${entityId}::uuid AND hq_city IS NULL RETURNING entity_id`);
        filled.hq_city += u.rows.length;
      }
      if (r.countryIso !== undefined && /^[A-Z]{2}$/.test(r.countryIso)) {
        const u = await db.execute(sql`
          UPDATE organizations SET hq_country = ${r.countryIso}
          WHERE entity_id = ${entityId}::uuid AND hq_country IS NULL RETURNING entity_id`);
        filled.hq_country += u.rows.length;
      }
      if (r.email !== undefined && r.email.includes("@")) {
        const u = await db.execute(sql`
          UPDATE organizations SET corporate_email = ${r.email}
          WHERE entity_id = ${entityId}::uuid AND corporate_email IS NULL RETURNING entity_id`);
        filled.corporate_email += u.rows.length;
      }
      if (r.phone !== undefined && r.phone.length <= 40) {
        const u = await db.execute(sql`
          UPDATE organizations SET corporate_phone = ${r.phone}
          WHERE entity_id = ${entityId}::uuid AND corporate_phone IS NULL RETURNING entity_id`);
        filled.corporate_phone += u.rows.length;
      }
      await db.execute(sql`
        INSERT INTO entity_tags (entity_id, tag) VALUES (${entityId}::uuid, 'wikidata_enriched')
        ON CONFLICT DO NOTHING`);
    }
    console.log(
      `  batch ${batches} (${i + slice.length}/${leis.length}) · matched so far ${matched} · websites ${filled.website}`,
    );
    await sleep(1500); // polite: WDQS asks for low concurrency
  }

  console.log(
    `\nwikidata-enrich done: ${matched} LEI matches from ${batches} batches\n` +
      `  websites ${filled.website} · incorporation_date ${filled.incorporation_date} · founded_year ${filled.founded_year}\n` +
      `  legal_form ${filled.legal_form_native} · hq_city ${filled.hq_city} · hq_country ${filled.hq_country}\n` +
      `  email ${filled.corporate_email} · phone ${filled.corporate_phone}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

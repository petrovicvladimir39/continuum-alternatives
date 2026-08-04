import "./env";
import { db, sql } from "@continuum/db";

/**
 * EUROPE DEPTH RUN — register-grade multi-field enrichment from the GLEIF
 * LEI API ($0, keyless, deterministic; joined on LEI, an exact global key).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/gleif-enrich.ts [--limit N]
 *
 * GLEIF is TIER-1 register grade: every record is validated by an accredited
 * LOU against the entity's home business register. Fields filled (FILL-NULL
 * ONLY — an existing value always wins, nothing overwritten, nothing guessed):
 *
 *   entity.legalName.name        -> legal_name
 *   entity.legalForm.id/other    -> legal_form_native (ELF code or free text)
 *   entity.status                -> legal_status (ACTIVE|INACTIVE -> active|dissolved)
 *   entity.creationDate          -> incorporation_date + founded_year
 *   entity.registeredAs          -> registry_id when we hold none (the NATIONAL
 *                                   registration number — HRB, SIREN, KvK…)
 *   entity.legalAddress          -> registered_address {street, city, postal, country}
 *   entity.headquartersAddress   -> hq_city + hq_country
 *
 * Financials are NOT taken from here (GLEIF carries none) and nothing is
 * estimated. Entities are never CREATED by this pass — gap-fill only, tagged
 * `gleif_enriched` so provenance stays visible.
 */

const API = "https://api.gleif.org/api/v1/lei-records";
const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";
const BATCH = 100; // GLEIF allows comma-separated filter[lei] lists
const RETRIES = 2;

type GleifAddress = {
  addressLines?: string[];
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type GleifRecord = {
  attributes: {
    lei: string;
    entity: {
      legalName?: { name?: string };
      legalForm?: { id?: string | null; other?: string | null };
      status?: string;
      creationDate?: string | null;
      registeredAs?: string | null;
      legalAddress?: GleifAddress;
      headquartersAddress?: GleifAddress;
    };
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBatch(leis: string[]): Promise<GleifRecord[]> {
  const url = `${API}?filter%5Blei%5D=${leis.join(",")}&page%5Bsize%5D=${leis.length}`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "application/vnd.api+json" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    throw new Error(`GLEIF ${res.status}`);
  }
  const json = (await res.json()) as { data?: GleifRecord[] };
  return json.data ?? [];
}

async function main(): Promise<void> {
  const limIdx = process.argv.indexOf("--limit");
  const limit = limIdx >= 0 ? Number.parseInt(process.argv[limIdx + 1] ?? "0", 10) : 0;

  const target = await db.execute(sql`
    SELECT o.entity_id, o.lei_code
    FROM organizations o
    WHERE o.lei_code IS NOT NULL
      AND (o.legal_name IS NULL OR o.legal_form_native IS NULL OR o.legal_status IS NULL
           OR o.incorporation_date IS NULL OR o.registered_address IS NULL
           OR o.hq_city IS NULL OR o.hq_country IS NULL)
    ORDER BY o.lei_code
    ${limit > 0 ? sql`LIMIT ${limit}` : sql``}
  `);
  const rows = target.rows as { entity_id: string; lei_code: string }[];
  const byLei = new Map(rows.map((r) => [r.lei_code.trim(), r.entity_id]));
  const leis = [...byLei.keys()].filter((l) => /^[A-Z0-9]{20}$/.test(l));
  console.log(`gleif-enrich: ${leis.length} LEI-bearing entities with at least one gap`);

  const filled: Record<string, number> = {
    legal_name: 0,
    legal_form_native: 0,
    legal_status: 0,
    incorporation_date: 0,
    founded_year: 0,
    registry_id: 0,
    registered_address: 0,
    hq_city: 0,
    hq_country: 0,
  };
  let matched = 0;
  let batches = 0;

  for (let i = 0; i < leis.length; i += BATCH) {
    const slice = leis.slice(i, i + BATCH);
    let records: GleifRecord[] | undefined;
    for (let attempt = 0; attempt <= RETRIES && records === undefined; attempt++) {
      try {
        records = await fetchBatch(slice);
      } catch (error) {
        if (attempt === RETRIES) {
          console.log(`  batch at ${i} failed: ${String(error).slice(0, 80)}`);
        }
        await sleep(3000 * (attempt + 1));
      }
    }
    if (records === undefined) {
      continue;
    }
    batches += 1;

    for (const rec of records) {
      const a = rec.attributes;
      const entityId = byLei.get(a.lei);
      if (entityId === undefined) {
        continue;
      }
      matched += 1;
      const e = a.entity;

      const legalName = e.legalName?.name;
      if (legalName !== undefined && legalName !== "") {
        const u = await db.execute(sql`
          UPDATE organizations SET legal_name = ${legalName}
          WHERE entity_id = ${entityId}::uuid AND legal_name IS NULL RETURNING entity_id`);
        filled.legal_name = (filled.legal_name ?? 0) + u.rows.length;
      }

      // ELF code (e.g. 2HBR) or the LOU's free-text form; verbatim either way.
      const legalForm = e.legalForm?.other ?? e.legalForm?.id ?? null;
      if (legalForm !== null && legalForm !== "") {
        const u = await db.execute(sql`
          UPDATE organizations SET legal_form_native = ${legalForm}
          WHERE entity_id = ${entityId}::uuid AND legal_form_native IS NULL RETURNING entity_id`);
        filled.legal_form_native = (filled.legal_form_native ?? 0) + u.rows.length;
      }

      if (e.status === "ACTIVE" || e.status === "INACTIVE") {
        const mapped = e.status === "ACTIVE" ? "active" : "dissolved";
        const u = await db.execute(sql`
          UPDATE organizations SET legal_status = ${mapped}
          WHERE entity_id = ${entityId}::uuid AND legal_status IS NULL RETURNING entity_id`);
        filled.legal_status = (filled.legal_status ?? 0) + u.rows.length;
      }

      const created = e.creationDate;
      if (created !== null && created !== undefined && created.length >= 10) {
        const iso = created.slice(0, 10);
        const u = await db.execute(sql`
          UPDATE organizations SET incorporation_date = ${iso}::date
          WHERE entity_id = ${entityId}::uuid AND incorporation_date IS NULL RETURNING entity_id`);
        filled.incorporation_date = (filled.incorporation_date ?? 0) + u.rows.length;
        const y = Number.parseInt(iso.slice(0, 4), 10);
        if (Number.isFinite(y) && y > 1600 && y <= new Date().getFullYear()) {
          const u2 = await db.execute(sql`
            UPDATE organizations SET founded_year = ${y}
            WHERE entity_id = ${entityId}::uuid AND founded_year IS NULL RETURNING entity_id`);
          filled.founded_year = (filled.founded_year ?? 0) + u2.rows.length;
        }
      }

      // National registration number — only where we hold none, and never
      // over the LEI itself (registry_id holds the bare LEI for GLEIF rows).
      const registeredAs = e.registeredAs;
      if (registeredAs !== null && registeredAs !== undefined && registeredAs.trim() !== "") {
        const u = await db.execute(sql`
          UPDATE organizations SET registry_id = ${registeredAs.trim()}
          WHERE entity_id = ${entityId}::uuid AND registry_id IS NULL RETURNING entity_id`);
        filled.registry_id = (filled.registry_id ?? 0) + u.rows.length;
      }

      const la = e.legalAddress;
      if (la !== undefined) {
        const address = {
          ...(la.addressLines !== undefined && la.addressLines.length > 0
            ? { street: la.addressLines.filter((s) => s !== "").join(", ") }
            : {}),
          ...(la.city !== null && la.city !== undefined && la.city !== "" ? { city: la.city } : {}),
          ...(la.postalCode !== null && la.postalCode !== undefined && la.postalCode !== ""
            ? { postal: la.postalCode }
            : {}),
          ...(la.country !== null && la.country !== undefined ? { country: la.country } : {}),
        };
        if (Object.keys(address).length > 0) {
          const u = await db.execute(sql`
            UPDATE organizations SET registered_address = ${JSON.stringify(address)}::jsonb
            WHERE entity_id = ${entityId}::uuid AND registered_address IS NULL RETURNING entity_id`);
          filled.registered_address = (filled.registered_address ?? 0) + u.rows.length;
        }
      }

      const hq = e.headquartersAddress ?? la;
      if (hq?.city !== null && hq?.city !== undefined && hq.city !== "") {
        const u = await db.execute(sql`
          UPDATE organizations SET hq_city = ${hq.city}
          WHERE entity_id = ${entityId}::uuid AND hq_city IS NULL RETURNING entity_id`);
        filled.hq_city = (filled.hq_city ?? 0) + u.rows.length;
      }
      if (hq?.country !== null && hq?.country !== undefined && /^[A-Z]{2}$/.test(hq.country)) {
        const u = await db.execute(sql`
          UPDATE organizations SET hq_country = ${hq.country}
          WHERE entity_id = ${entityId}::uuid AND hq_country IS NULL RETURNING entity_id`);
        filled.hq_country = (filled.hq_country ?? 0) + u.rows.length;
      }

      await db.execute(sql`
        INSERT INTO entity_tags (entity_id, tag) VALUES (${entityId}::uuid, 'gleif_enriched')
        ON CONFLICT DO NOTHING`);
    }

    if (batches % 10 === 0 || i + BATCH >= leis.length) {
      console.log(
        `  ${Math.min(i + BATCH, leis.length)}/${leis.length} · matched ${matched} · addresses ${filled.registered_address} · reg-numbers ${filled.registry_id}`,
      );
    }
    await sleep(600); // polite pacing against a free public API
  }

  console.log(
    `\ngleif-enrich done: ${matched} LEI matches from ${batches} batches\n` +
      Object.entries(filled)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n"),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

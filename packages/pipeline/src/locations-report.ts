import "./env";
import { db, sql } from "@continuum/db";

/**
 * LOGO-PIN MAP S1 — coverage report: rooftop/street/city split, per-country
 * coverage of active entities, and the top-10 collision buildings (the
 * fund-admin / law-firm rooftops the SPV trap warns about).
 */
async function main(): Promise<void> {
  const split = (
    await db.execute(sql`
      SELECT source, precision, count(*)::int AS n
      FROM entity_locations
      GROUP BY 1, 2
      ORDER BY 1, 2
    `)
  ).rows as { source: string; precision: string | null; n: number }[];
  console.log("── source × precision ──");
  for (const row of split) {
    console.log(`${row.source.padEnd(18)} ${(row.precision ?? "pending").padEnd(8)} ${row.n}`);
  }

  const [coverage] = (
    await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM entities WHERE status = 'active') AS active,
        count(DISTINCT l.entity_id)::int AS located,
        count(DISTINCT l.entity_id) FILTER (WHERE l.precision = 'rooftop')::int AS rooftop,
        count(DISTINCT l.entity_id) FILTER (WHERE l.precision = 'street')::int AS street
      FROM entity_locations l
      WHERE l.lat IS NOT NULL
    `)
  ).rows as { active: number; located: number; rooftop: number; street: number }[];
  if (coverage !== undefined) {
    const pct = ((100 * coverage.located) / coverage.active).toFixed(1);
    console.log(`\n── coverage ── ${coverage.located}/${coverage.active} active entities located (${pct}%)`);
    console.log(`rooftop entities: ${coverage.rooftop}, street: ${coverage.street}`);
  }

  const perCountry = (
    await db.execute(sql`
      SELECT e.country,
        count(*)::int AS active,
        count(l.entity_id)::int AS located,
        count(l.entity_id) FILTER (WHERE l.precision IN ('rooftop','street'))::int AS street_plus
      FROM entities e
      LEFT JOIN LATERAL (
        SELECT DISTINCT ON (entity_id) entity_id, precision
        FROM entity_locations
        WHERE entity_id = e.id AND lat IS NOT NULL
        ORDER BY entity_id,
          CASE precision WHEN 'rooftop' THEN 0 WHEN 'street' THEN 1 ELSE 2 END
      ) l ON true
      WHERE e.status = 'active' AND e.country IS NOT NULL
      GROUP BY 1 ORDER BY active DESC LIMIT 40
    `)
  ).rows as { country: string; active: number; located: number; street_plus: number }[];
  console.log("\n── per-country (active / located / street+) ──");
  for (const row of perCountry) {
    const pct = row.active > 0 ? ((100 * row.located) / row.active).toFixed(0) : "0";
    console.log(
      `${row.country}  ${String(row.active).padStart(6)} ${String(row.located).padStart(6)} (${pct.padStart(3)}%) ${String(row.street_plus).padStart(6)}`,
    );
  }

  const buildings = (
    await db.execute(sql`
      SELECT round(lat::numeric,5) AS rlat, round(lon::numeric,5) AS rlon,
             count(*)::int AS n,
             min(raw_address) AS sample_address,
             (array_agg(e.name ORDER BY e.name))[1:3] AS sample_names
      FROM entity_locations l
      JOIN entities e ON e.id = l.entity_id
      WHERE l.source = 'register_address' AND l.precision IN ('rooftop','street')
      GROUP BY 1, 2
      ORDER BY n DESC
      LIMIT 10
    `)
  ).rows as { n: number; sample_address: string; sample_names: string[] }[];
  console.log("\n── top 10 collision buildings ──");
  for (const b of buildings) {
    console.log(`${String(b.n).padStart(5)}  ${b.sample_address}  [${(b.sample_names ?? []).join(" · ")}]`);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);

import "./env";
import { db, sql } from "@continuum/db";

/**
 * CLEAN-100 storage guard + corpus snapshot — $0, read-only.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/db-stats.ts [--guard]
 *
 * --guard: print only DB size vs the 400MB soft ceiling and exit 1 at ceiling
 * (callers between bulk slices STOP on non-zero). Without --guard, prints the
 * full snapshot: corpus by country, facts by country, queue depths.
 */

const SOFT_CEILING_MB = 400;

async function main(): Promise<void> {
  const guardOnly = process.argv.includes("--guard");

  const sizeRows = await db.execute(
    sql`select pg_database_size(current_database())::bigint as bytes`,
  );
  const bytes = Number((sizeRows.rows[0] as { bytes: string }).bytes);
  const mb = bytes / (1024 * 1024);
  console.log(`db size: ${mb.toFixed(1)} MB / ${SOFT_CEILING_MB} MB soft ceiling`);
  if (mb >= SOFT_CEILING_MB) {
    console.error("STORAGE GUARD: at or above soft ceiling — STOP");
    process.exit(1);
  }
  if (guardOnly) {
    process.exit(0);
  }

  const entByCountry = await db.execute(
    sql`select country, count(*)::int as n from entities where status = 'active' group by country order by n desc`,
  );
  console.log("\nactive entities by country:");
  for (const row of entByCountry.rows as { country: string | null; n: number }[]) {
    console.log(`  ${row.country ?? "??"}  ${row.n}`);
  }
  const entTotal = await db.execute(
    sql`select status, count(*)::int as n from entities group by status order by n desc`,
  );
  console.log("entities by status:");
  for (const row of entTotal.rows as { status: string; n: number }[]) {
    console.log(`  ${row.status}  ${row.n}`);
  }

  const factRows = await db.execute(
    sql`select coalesce(e.country,'??') as country, tf.status, count(*)::int as n
        from timeline_facts tf join entities e on e.id = tf.entity_id
        group by 1, 2 order by 3 desc`,
  );
  console.log("\ntimeline facts by country/status:");
  for (const row of factRows.rows as { country: string; status: string; n: number }[]) {
    console.log(`  ${row.country}  ${row.status}  ${row.n}`);
  }

  const edgeRows = await db.execute(
    sql`select edge_type, status, count(*)::int as n from edges group by 1,2 order by 3 desc`,
  );
  console.log("\nedges by type/status:");
  for (const row of edgeRows.rows as { edge_type: string; status: string; n: number }[]) {
    console.log(`  ${row.edge_type}  ${row.status}  ${row.n}`);
  }

  const srcRows = await db.execute(
    sql`select source_type, active, count(*)::int as n from sources group by 1,2 order by 3 desc`,
  );
  console.log("\nsources by type/active:");
  for (const row of srcRows.rows as { source_type: string; active: boolean; n: number }[]) {
    console.log(`  ${row.source_type}  ${row.active ? "active" : "inactive"}  ${row.n}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

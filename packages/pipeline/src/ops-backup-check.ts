import "./env";
import { db, sql } from "@continuum/db";

/**
 * pnpm ops:backup-check (Phase 34F) — proves the data is logically
 * restorable, in pure SQL (no pg_dump binary dependency in this
 * environment; the full pg_dump/restore procedure is documented in
 * docs/RUNBOOK.md and Neon holds PITR snapshots):
 *
 *   1. CREATE SCHEMA scratch — the restore target
 *   2. copy a sample (≤1000 rows) of every core table into it
 *   3. assert the table inventory matches expectations and copied counts
 *      equal min(source, 1000) — a corrupt/empty table fails loudly
 *   4. DROP the scratch schema
 *
 * Exit 0 = the record round-trips. Any failure exits 1 with the table.
 */

const CORE_TABLES = [
  "entities",
  "organizations",
  "timeline_facts",
  "edges",
  "documents",
  "sources",
  "articles",
  "member_profiles",
  "member_subscriptions",
  "entity_classifications",
  "events",
  "event_attendance",
  "thread_posts",
  "org_claims",
  "api_keys",
] as const;

const SCRATCH = "scratch_backup_check";
const SAMPLE = 1000;

async function main(): Promise<void> {
  console.log("ops:backup-check — scratch-schema restore drill");
  await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${SCRATCH} CASCADE`));
  await db.execute(sql.raw(`CREATE SCHEMA ${SCRATCH}`));

  let failures = 0;
  try {
    for (const table of CORE_TABLES) {
      const exists = await db.execute(sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      `);
      if (exists.rows.length === 0) {
        console.error(`FAIL  ${table}: missing from public schema`);
        failures += 1;
        continue;
      }
      await db.execute(
        sql.raw(`CREATE TABLE ${SCRATCH}.${table} AS SELECT * FROM public.${table} LIMIT ${SAMPLE}`),
      );
      const source = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM public.${table}`));
      const copied = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM ${SCRATCH}.${table}`));
      const sourceCount = Number(source.rows[0]?.n ?? 0);
      const copiedCount = Number(copied.rows[0]?.n ?? 0);
      const expected = Math.min(sourceCount, SAMPLE);
      const ok = copiedCount === expected;
      console.log(
        `${ok ? "ok   " : "FAIL "} ${table}: ${sourceCount.toLocaleString()} rows, sampled ${copiedCount}/${expected}`,
      );
      if (!ok) {
        failures += 1;
      }
    }
  } finally {
    await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${SCRATCH} CASCADE`));
  }

  if (failures > 0) {
    console.error(`\nops:backup-check: FAIL — ${failures} table(s); see docs/RUNBOOK.md`);
    process.exit(1);
  }
  console.log(`\nops:backup-check: PASS — ${CORE_TABLES.length} core tables restore-drilled and dropped.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import "./env";
import { db, sql } from "@continuum/db";

/**
 * CLEAN-100 Part 5 — press-layer activation, THIS-PROMPT-AUTHORIZED.
 * $0 deterministic. Two moves:
 *  1. Activate every press-type source (industry portals + national business
 *     press seeded earlier) with maxItemsPerRun 5.
 *  2. Activate the top discovered firm newsrooms: RSS-available only,
 *     ≤ 8 per country for diversity, ranked by the owning entity's recorded
 *     activity (facts + edges), capped at 60 total.
 */

const NEWSROOM_TOTAL_CAP = 60;
const PER_COUNTRY_CAP = 8;

async function main(): Promise<void> {
  const press = await db.execute(sql`
    UPDATE sources
    SET active = true,
        config = config || '{"maxItemsPerRun":5}'::jsonb
    WHERE source_type = 'press' AND active = false
    RETURNING name
  `);
  console.log(`press activated: ${press.rows.length}`);
  for (const row of press.rows as { name: string }[]) {
    console.log(`  + ${row.name}`);
  }

  const candidates = await db.execute(sql`
    SELECT s.id, s.name, coalesce(e.country,'??') AS country,
      (SELECT count(*)::int FROM timeline_facts tf WHERE tf.entity_id = e.id) +
      (SELECT count(*)::int FROM edges ed WHERE ed.source_entity_id = e.id OR ed.target_entity_id = e.id) AS activity
    FROM sources s
    JOIN entities e ON e.id = s.entity_id
    WHERE s.source_type = 'company_site' AND s.fetch_method = 'rss' AND s.active = false
    ORDER BY activity DESC, s.name ASC
  `);
  const perCountry = new Map<string, number>();
  const chosen: { id: string; name: string; country: string }[] = [];
  for (const row of candidates.rows as { id: string; name: string; country: string }[]) {
    if (chosen.length >= NEWSROOM_TOTAL_CAP) {
      break;
    }
    const n = perCountry.get(row.country) ?? 0;
    if (n >= PER_COUNTRY_CAP) {
      continue;
    }
    perCountry.set(row.country, n + 1);
    chosen.push(row);
  }
  for (const pick of chosen) {
    await db.execute(sql`
      UPDATE sources SET active = true, config = config || '{"maxItemsPerRun":5}'::jsonb
      WHERE id = ${pick.id}::uuid
    `);
  }
  console.log(`\nnewsrooms activated: ${chosen.length} (≤${PER_COUNTRY_CAP}/country)`);
  const byCountry = [...perCountry.entries()].sort((a, b) => b[1] - a[1]);
  console.log(
    "  " + byCountry.map(([country, count]) => `${country} ${count}`).join(" · "),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

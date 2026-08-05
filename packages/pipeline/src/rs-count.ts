import "./env";
import { readFileSync } from "node:fs";
import { db, sql } from "@continuum/db";
async function main() {
  // Denominator = the live harvest queue, not the original sitemap count.
  let queue = 0;
  try {
    queue = (JSON.parse(readFileSync("C:/dev/continuum-alternatives/data/kompanije-urls.json", "utf8")) as string[]).length;
  } catch { queue = 0; }
  const r = await db.execute(sql`select count(*)::int n from organizations where category_fields->>'source' = 'kompanije.co.rs'`);
  const s = await db.execute(sql`select count(*)::int n from entity_tags where tag='rs_sector_target'`);
  const n = (r.rows[0] as { n: number }).n;
  const pct = queue > 0 ? Math.round((n / queue) * 100) : 0;
  console.log(`${n}/${queue} imported (${pct}%) · target-sector ${(s.rows[0] as { n: number }).n}`);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(String(e).slice(0,120));process.exit(1)});

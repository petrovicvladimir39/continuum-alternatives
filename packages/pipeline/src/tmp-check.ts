import "./env";
import { db, sql } from "@continuum/db";
async function main() {
  const g = await db.execute(sql`select count(*)::int n from entities where geo is not null and country='DE'`);
  const w = await db.execute(sql`select count(*)::int n from organizations o join entities e on e.id=o.entity_id where e.country='DE' and o.website is not null`);
  const l = await db.execute(sql`select count(*)::int n from organizations o join entities e on e.id=o.entity_id where e.country='DE' and o.logo_url is not null`);
  console.log("DE geo:", JSON.stringify(g.rows), "website:", JSON.stringify(w.rows), "logo:", JSON.stringify(l.rows));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});

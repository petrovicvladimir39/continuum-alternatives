import "./env";
import { db, sql } from "@continuum/db";
async function main() {
  const r = await db.execute(sql`
    select
      count(*) filter (where o.website is not null)::int with_site,
      count(*) filter (where o.enrichment->'website_crawl' is not null)::int crawled,
      count(o.logo_url)::int logo, count(o.corporate_email)::int email,
      count(e.summary)::int summary
    from entities e join organizations o on o.entity_id=e.id where e.country='RS'`);
  const g = await db.execute(sql`
    select count(distinct el.entity_id)::int n from entity_locations el
    join entities e on e.id=el.entity_id
    where e.country='RS' and el.precision in ('rooftop','street')`);
  const x = r.rows[0] as Record<string, number>;
  console.log(`${x.crawled}/${x.with_site} sites crawled · logo ${x.logo} · email ${x.email} · summary ${x.summary} · rooftop/street ${(g.rows[0] as { n: number }).n}`);
}
main().then(()=>process.exit(0)).catch(e=>{console.error(String(e).slice(0,120));process.exit(1)});

import "./env";
import { classifyFromLicence } from "@continuum/shared";
import { db, sql } from "@continuum/db";

/**
 * SERBIA DEEP RUN — S4 deterministic classification + role/ownership tagging.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-classify.ts
 *
 * Signals, in confidence order (first match wins; NEVER force-fit — an entity
 * with no matching signal stays unclassified, which is a valid outcome):
 *   1. existing role/licence tags (bank, servicer, law_firm, lp_dfi, …)
 *   2. legal-form + name tokens that are licence-equivalent in RS
 *      (društvo za upravljanje = ManCo, brokersko-dilersko = investment firm,
 *       DPF = voluntary pension fund, lizing, osiguranje, faktoring …)
 *   3. the entity's own website summary (verbatim text already stored)
 *
 * All rows land status='proposed' (source 'keyword') — review-gated, never
 * auto-approved, per the constitution.
 */

/** RS-specific name/legal-form signals → taxonomy + role. */
const RS_SIGNALS: { re: RegExp; l1: string; l2?: string; l3?: string; role: string }[] = [
  { re: /društvo za upravljanje|drustvo za upravljanje|investicionim fondovima/i, l1: "liquid_alts", role: "ManCo" },
  { re: /otvoreni investicioni fond|zatvoreni investicioni fond|investicioni fond/i, l1: "liquid_alts", role: "Fund Vehicle" },
  { re: /dobrovoljni penzijski fond|penzijski fond|\bDPF\b/i, l1: "service_graph", role: "LP" },
  { re: /brokersko.?dilersk/i, l1: "service_graph", role: "Advisor" },
  { re: /kastodi|custody/i, l1: "service_graph", l2: "asset_servicing", l3: "custodian", role: "Vendor" },
  { re: /osigura(nje|vaju)|reosiguranj/i, l1: "service_graph", role: "LP" },
  { re: /lizing|leasing/i, l1: "private_debt", l2: "asset_backed_lending", role: "GP" },
  { re: /faktoring|factoring/i, l1: "private_debt", l2: "asset_backed_lending", l3: "trade_finance", role: "GP" },
  { re: /stečajn|stecajn|insolven/i, l1: "service_graph", l2: "legal_advisory", l3: "insolvency_practitioner", role: "Advisor" },
  { re: /\bbanka\b|\bbank\b/i, l1: "service_graph", role: "Bank" },
  { re: /advokat|law (firm|office)|odvjetni|pravna kancelarij/i, l1: "service_graph", l2: "legal_advisory", role: "Advisor" },
  { re: /revizij|audit|računovodstv|racunovodstv/i, l1: "service_graph", l2: "legal_advisory", role: "Advisor" },
  { re: /venture|vc fund|akcelerator|accelerator|startup fond/i, l1: "pe_growth", l2: "venture_capital", role: "GP" },
  { re: /private equity|privatn(i|og) kapital/i, l1: "pe_growth", role: "GP" },
  { re: /nekretnin|real estate|građevin|gradjevin/i, l1: "real_assets", l2: "private_real_estate", role: "Portfolio Co" },
  { re: /energetik|solarn|obnovljiv|renewable|energy/i, l1: "real_assets", l2: "energy_transition", role: "Portfolio Co" },
  { re: /naplat[ae] potraživanj|inkaso|collection agency/i, l1: "private_debt", l2: "npl", role: "Servicer" },
];

/** Existing corpus tags that already encode a role. */
const TAG_SIGNALS: Record<string, { l1: string; l2?: string; role: string }> = {
  bank: { l1: "service_graph", role: "Bank" },
  servicer: { l1: "private_debt", l2: "npl", role: "Servicer" },
  law_firm: { l1: "service_graph", l2: "legal_advisory", role: "Advisor" },
  insolvency_practitioner: { l1: "service_graph", l2: "legal_advisory", role: "Advisor" },
  lp_dfi: { l1: "service_graph", role: "LP" },
  lp_insurance: { l1: "service_graph", role: "LP" },
  lp_pension: { l1: "service_graph", role: "LP" },
  state_amc: { l1: "private_debt", l2: "npl", role: "Servicer" },
  deposit_insurance: { l1: "service_graph", role: "Regulator" },
  regulator: { l1: "service_graph", role: "Regulator" },
  stock_exchange: { l1: "service_graph", role: "Vendor" },
  fund_admin: { l1: "service_graph", l2: "fund_administration", role: "Vendor" },
  data_provider: { l1: "service_graph", l2: "technology", role: "Vendor" },
};

async function main(): Promise<void> {
  const rows = (
    await db.execute(sql`
      SELECT e.id, e.name, coalesce(e.summary,'') AS summary,
             coalesce(o.legal_form_native,'') AS lf,
             coalesce((SELECT string_agg(t.tag, ' ') FROM entity_tags t WHERE t.entity_id = e.id), '') AS tags
      FROM entities e LEFT JOIN organizations o ON o.entity_id = e.id
      WHERE e.country = 'RS'
    `)
  ).rows as { id: string; name: string; summary: string; lf: string; tags: string }[];

  console.log(`serbia-classify: ${rows.length} RS entities`);
  let classified = 0;
  let roles = 0;
  let unclassified = 0;
  const byL1 = new Map<string, number>();

  for (const row of rows) {
    let hit: { l1: string; l2?: string; l3?: string; role: string } | undefined;

    // 1. tags
    for (const [tag, sig] of Object.entries(TAG_SIGNALS)) {
      if (new RegExp(`(^| )${tag}( |$)`).test(row.tags)) {
        hit = sig;
        break;
      }
    }
    // 2. name / legal form
    if (hit === undefined) {
      const hay = `${row.name} ${row.lf}`;
      for (const s of RS_SIGNALS) {
        if (s.re.test(hay)) {
          hit = { l1: s.l1, ...(s.l2 !== undefined ? { l2: s.l2 } : {}), ...(s.l3 !== undefined ? { l3: s.l3 } : {}), role: s.role };
          break;
        }
      }
    }
    // 3. the company's own summary
    if (hit === undefined && row.summary !== "") {
      for (const s of RS_SIGNALS) {
        if (s.re.test(row.summary)) {
          hit = { l1: s.l1, ...(s.l2 !== undefined ? { l2: s.l2 } : {}), ...(s.l3 !== undefined ? { l3: s.l3 } : {}), role: s.role };
          break;
        }
      }
    }
    // 4. shared multilingual licence classifier as a last deterministic pass
    if (hit === undefined) {
      const c = classifyFromLicence(`${row.name} ${row.lf} ${row.summary.slice(0, 300)}`);
      if (c !== undefined) {
        hit = { l1: c.l1, ...(c.l2 !== undefined ? { l2: c.l2 } : {}), ...(c.l3 !== undefined ? { l3: c.l3 } : {}), role: c.role ?? "Vendor" };
      }
    }

    if (hit === undefined) {
      unclassified += 1;
      continue;
    }

    const inserted = await db.execute(sql`
      INSERT INTO entity_classifications (entity_id, asset_class, strategy, sub_class, source, status, confidence)
      VALUES (${row.id}::uuid, ${hit.l1}, ${hit.l3 ?? ""}, ${hit.l2 ?? null}, 'keyword', 'proposed', '0.70')
      ON CONFLICT DO NOTHING RETURNING entity_id`);
    classified += inserted.rows.length;
    byL1.set(hit.l1, (byL1.get(hit.l1) ?? 0) + 1);

    const r = await db.execute(sql`
      UPDATE organizations SET primary_role = ${hit.role}
      WHERE entity_id = ${row.id}::uuid AND primary_role IS NULL RETURNING entity_id`);
    roles += r.rows.length;
  }

  console.log(
    `\nserbia-classify done: ${classified} classifications PROPOSED · ${roles} roles set · ${unclassified} left honestly unclassified`,
  );
  for (const [l1, n] of [...byL1.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${l1}: ${n}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

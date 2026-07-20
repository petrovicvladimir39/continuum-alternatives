import "./env";
import {
  ALT_TAXONOMY,
  CLASS_LEVEL,
  KEYWORD_RULES,
  TAG_TAXONOMY_MAP,
  classifiedLabel,
  frontHrefFor,
  mapLegacyFundStrategy,
  meetsCoverageThreshold,
  parseAsk,
  strategyBySlug,
} from "@continuum/shared";
import { db, sql } from "@continuum/db";

/**
 * Verify: Phase 26 taxonomy layer — vocabulary integrity, deterministic
 * tag map, keyword-pass approval discipline, coverage gating math, parser
 * strategy resolution, fund strategy migration.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

async function main(): Promise<void> {
  console.log("— taxonomy integrity —");
  const classSlugs = ALT_TAXONOMY.map((c) => c.slug);
  check(classSlugs.length === 9, `nine asset classes modeled (spec enumerates nine; got ${classSlugs.length})`);
  check(new Set(classSlugs).size === classSlugs.length, "class slugs unique");
  const strategySlugs = ALT_TAXONOMY.flatMap((c) => c.strategies.map((s) => s.slug));
  check(new Set(strategySlugs).size === strategySlugs.length, "strategy slugs globally unique");
  check(
    ALT_TAXONOMY.every((c) => c.strategies.every((s) => s.synonyms.length >= 2)),
    "every strategy has ≥2 synonyms",
  );
  check(strategyBySlug("ils_cat_bonds")?.assetClass.slug === "climate", "strategy lookup resolves class");
  check(
    classifiedLabel("climate", "ils_cat_bonds") === "Climate & Insurance · Cat Bonds & ILS",
    "classified label carries class prefix",
  );
  check(classifiedLabel("hedge_funds", CLASS_LEVEL) === "Hedge Funds", "class-level label is the class");

  console.log("\n— tag-map determinism —");
  const validPairs = new Set<string>();
  for (const c of ALT_TAXONOMY) {
    validPairs.add(`${c.slug}:${CLASS_LEVEL}`);
    for (const s of c.strategies) {
      validPairs.add(`${c.slug}:${s.slug}`);
    }
  }
  check(
    Object.values(TAG_TAXONOMY_MAP).every((t) => validPairs.has(`${t.assetClass}:${t.strategy}`)),
    "every tag-map target exists in the taxonomy",
  );
  check(
    Object.values(KEYWORD_RULES).every((r) => validPairs.has(`${r.assetClass}:${r.strategy}`)),
    "every keyword-rule target exists in the taxonomy",
  );
  check(TAG_TAXONOMY_MAP.gp_vc?.strategy === "venture_capital", "gp_vc → venture_capital");
  check(TAG_TAXONOMY_MAP.gp_pe?.strategy === CLASS_LEVEL, "gp_pe → class-level private_equity");

  console.log("\n— keyword pass never auto-approves (live corpus) —");
  const keywordStatuses = await db.execute(sql`
    SELECT DISTINCT status FROM entity_classifications WHERE source = 'keyword'
  `);
  check(
    keywordStatuses.rows.every((row) => row.status === "proposed"),
    `keyword rows are only ever proposed (got ${keywordStatuses.rows.map((r) => r.status).join(",") || "none"})`,
  );
  const tagMapStatuses = await db.execute(sql`
    SELECT DISTINCT status FROM entity_classifications WHERE source = 'tag_map'
  `);
  check(
    tagMapStatuses.rows.every((row) => row.status === "approved"),
    "tag_map rows are approved (deterministic standing)",
  );

  console.log("\n— coverage threshold math + gating —");
  check(meetsCoverageThreshold({ entities: 15, signals: 0 }), "15 entities clears");
  check(meetsCoverageThreshold({ entities: 0, signals: 10 }), "10 signals clears");
  check(!meetsCoverageThreshold({ entities: 14, signals: 9 }), "14/9 stays Building");
  check(!meetsCoverageThreshold({ entities: 0, signals: 0 }), "empty stays Building");
  check(frontHrefFor("private_equity", "venture_capital") === "/markets/venture-capital", "VC maps to curated front");
  check(frontHrefFor("private_credit", "npl") === "/markets/distressed", "NPL maps to distressed front");
  check(frontHrefFor("climate", "ils_cat_bonds") === "/markets/ils_cat_bonds", "uncurated strategy → generic taxonomy front");
  check(frontHrefFor("hedge_funds", CLASS_LEVEL) === "/markets/hedge_funds", "class-level → class front");

  console.log("\n— parser strategy resolution (15 fixtures) —");
  const cases: { q: string; strategies?: string[]; assetClasses?: string[]; countries?: string[] }[] = [
    { q: "cat bonds in europe", strategies: ["ils_cat_bonds"] },
    { q: "ILS funds", strategies: ["ils_cat_bonds"] },
    { q: "music royalties funds", strategies: ["ip_royalties"] },
    { q: "CLO managers Germany", strategies: ["clo"], countries: ["DE"] },
    { q: "CLOs", strategies: ["clo"] },
    { q: "farmland investors", strategies: ["natural_resources"] },
    { q: "timber", strategies: ["natural_resources"] },
    { q: "litigation funding", strategies: ["litigation_finance"] },
    { q: "carbon credits France", strategies: ["carbon_markets"], countries: ["FR"] },
    { q: "tokenized RWA", strategies: ["tokenized_rwa"] },
    { q: "aircraft leasing Ireland", strategies: ["transport_leasing"], countries: ["IE"] },
    { q: "managed futures", strategies: ["cta"] },
    { q: "hedge funds Sweden", assetClasses: ["hedge_funds"], countries: ["SE"] },
    { q: "real assets", assetClasses: ["real_assets"] },
    { q: "fine wine", strategies: ["wine_spirits"] },
  ];
  for (const fixture of cases) {
    const parsed = parseAsk(fixture.q);
    const ok =
      parsed !== null &&
      JSON.stringify([...(fixture.strategies ?? [])].sort()) === JSON.stringify([...parsed.strategies].sort()) &&
      JSON.stringify([...(fixture.assetClasses ?? [])].sort()) === JSON.stringify([...parsed.assetClasses].sort()) &&
      JSON.stringify([...(fixture.countries ?? [])].sort()) === JSON.stringify([...parsed.countries].sort());
    check(
      ok,
      `"${fixture.q}" → strategies ${JSON.stringify(parsed?.strategies)} classes ${JSON.stringify(parsed?.assetClasses)}`,
    );
  }
  // Channel precedence preserved: "venture capital" stays the channel.
  const vcParse = parseAsk("venture capital Poland");
  check(
    vcParse !== null && vcParse.channels.includes("vc_founders") && vcParse.strategies.length === 0,
    "channel synonyms keep precedence over taxonomy on collision",
  );

  console.log("\n— fund strategy migration —");
  check(mapLegacyFundStrategy("Buyout") === "lbo", "Buyout → lbo");
  check(mapLegacyFundStrategy("Early-stage venture") === "venture_capital", "venture text → venture_capital");
  check(mapLegacyFundStrategy("Private debt") === "direct_lending", "debt text → direct_lending");
  check(mapLegacyFundStrategy("Umbrella") === null, "unmappable → null (raw preserved)");
  const migrated = await db.execute(sql`
    SELECT count(*) FILTER (WHERE strategy IS NOT NULL AND strategy_raw IS NOT NULL)::int AS mapped,
           count(*) FILTER (WHERE strategy IS NULL AND strategy_raw IS NOT NULL)::int AS unmapped
    FROM fund_vehicles
  `);
  const m = migrated.rows[0] ?? {};
  check(Number(m.mapped ?? 0) >= 0 && Number(m.unmapped ?? -1) >= 0, `migration ledger readable (mapped ${m.mapped}, raw-only ${m.unmapped})`);
  const badSlugs = await db.execute(sql`
    SELECT DISTINCT strategy FROM fund_vehicles WHERE strategy IS NOT NULL
  `);
  const known = new Set(strategySlugs);
  check(
    badSlugs.rows.every((row) => known.has(String(row.strategy))),
    `fund strategies are taxonomy slugs only (got ${badSlugs.rows.map((r) => r.strategy).join(",") || "none"})`,
  );

  if (failures > 0) {
    console.error(`\nverify-taxonomy: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-taxonomy: PASS — taxonomy layer green");
  // Let the Neon websocket settle — immediate exit trips a libuv teardown
  // assertion on Windows (exit 0xC0000409 after a green run).
  await new Promise((resolve) => setTimeout(resolve, 300));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

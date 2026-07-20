import "./env";
import { CLASS_LEVEL, KEYWORD_RULES, TAG_TAXONOMY_MAP } from "@continuum/shared";
import { db, sql } from "@continuum/db";

/**
 * Retro-classification of the corpus (Phase 26B) — $0 deterministic, NO LLM.
 *
 *   pnpm classify:corpus
 *
 * Pass 1 (tag_map, APPROVED): the deterministic ENTITY_TAGS → taxonomy map.
 * Pass 2 (keyword, PROPOSED — never auto-approved): substring/word rules
 * over entity names + enrichment overviews; skips entities that already
 * hold an approved classification in the same asset class. Set-based SQL,
 * idempotent via the (entity, class, strategy) pk.
 */

async function main(): Promise<void> {
  console.log("— pass 1: tag_map (approved) —");
  let tagMapped = 0;
  for (const [tag, target] of Object.entries(TAG_TAXONOMY_MAP)) {
    const result = await db.execute(sql`
      INSERT INTO entity_classifications (entity_id, asset_class, strategy, source, confidence, status)
      SELECT t.entity_id, ${target.assetClass}, ${target.strategy}, 'tag_map', 1.00, 'approved'
      FROM entity_tags t
      WHERE t.tag = ${tag}
      ON CONFLICT (entity_id, asset_class, strategy) DO NOTHING
    `);
    const inserted = Number(result.rowCount ?? 0);
    tagMapped += inserted;
    if (inserted > 0) {
      console.log(`  ${tag} → ${target.assetClass}${target.strategy !== CLASS_LEVEL ? `/${target.strategy}` : " (class)"}: +${inserted}`);
    }
  }
  console.log(`tag_map total inserted: ${tagMapped}`);

  console.log("\n— pass 2: keyword (proposed, review-routed) —");
  let proposed = 0;
  for (const rule of KEYWORD_RULES) {
    const nameCondition = rule.wordBoundary
      ? sql`(e.name ~* ('\\m' || ${rule.pattern} || '\\M')
             OR coalesce(o.enrichment->>'overview_en', '') ~* ('\\m' || ${rule.pattern} || '\\M'))`
      : sql`(e.name ILIKE '%' || ${rule.pattern} || '%'
             OR coalesce(o.enrichment->>'overview_en', '') ILIKE '%' || ${rule.pattern} || '%')`;
    const result = await db.execute(sql`
      INSERT INTO entity_classifications (entity_id, asset_class, strategy, source, confidence, status)
      SELECT e.id, ${rule.assetClass}, ${rule.strategy}, 'keyword', 0.60, 'proposed'
      FROM entities e
      LEFT JOIN organizations o ON o.entity_id = e.id
      WHERE e.kind = 'organization'
        AND ${nameCondition}
        AND NOT EXISTS (SELECT 1 FROM entity_classifications a
                          WHERE a.entity_id = e.id AND a.asset_class = ${rule.assetClass}
                            AND a.status = 'approved')
      ON CONFLICT (entity_id, asset_class, strategy) DO NOTHING
    `);
    const inserted = Number(result.rowCount ?? 0);
    proposed += inserted;
    if (inserted > 0) {
      console.log(`  "${rule.pattern}" → ${rule.assetClass}${rule.strategy !== CLASS_LEVEL ? `/${rule.strategy}` : " (class)"}: +${inserted} proposed`);
    }
  }
  console.log(`keyword total proposed: ${proposed}`);

  console.log("\n— report —");
  const perStrategy = await db.execute(sql`
    SELECT asset_class, strategy, status, count(*)::int AS n
    FROM entity_classifications
    GROUP BY 1, 2, 3 ORDER BY 1, 2, 3
  `);
  console.log("class · strategy · status · n");
  for (const row of perStrategy.rows) {
    console.log(
      `  ${String(row.asset_class).padEnd(16)} ${String(row.strategy === "" ? "(class)" : row.strategy).padEnd(28)} ${String(row.status).padEnd(9)} ${row.n}`,
    );
  }
  const totals = await db.execute(sql`
    SELECT
      (SELECT count(DISTINCT entity_id)::int FROM entity_classifications WHERE status = 'approved') AS classified,
      (SELECT count(*)::int FROM entity_classifications WHERE status = 'proposed') AS queue,
      (SELECT count(*)::int FROM entities WHERE kind = 'organization' AND status = 'active'
         AND NOT EXISTS (SELECT 1 FROM entity_classifications c WHERE c.entity_id = entities.id)) AS unclassified,
      (SELECT count(*)::int FROM fund_vehicles WHERE strategy_raw IS NOT NULL AND strategy IS NULL) AS unmapped_fund_strategies
  `);
  const t = totals.rows[0] ?? {};
  console.log(
    `\nentities with approved classification: ${t.classified} · proposed queue: ${t.queue} · active orgs unclassified: ${t.unclassified} · legacy fund strategies unmappable: ${t.unmapped_fund_strategies}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { sql } from "drizzle-orm";
import { db } from "../client";

/**
 * Comps engine (Phase 34B) — deterministic value ranges per taxonomy
 * class from OUR OWN deal records with parsed numeric amounts. No outside
 * benchmarks, no estimates: min / median / max of what the record holds,
 * rendered only above the COMPS_MIN_DEALS gate (shared/comps.ts).
 */

export type CompsClassRow = {
  assetClass: string;
  dealCount: number;
  currencies: string[];
  minAmount: number;
  medianAmount: number;
  maxAmount: number;
};

/** Per-class stats over deals with amounts; ALL classes returned — the
 * caller applies the render gate (the Building note needs the counts). */
export async function compsByClass(): Promise<CompsClassRow[]> {
  const result = await db.execute(sql`
    SELECT c.asset_class,
      count(*)::int AS deal_count,
      array_agg(DISTINCT d.currency) FILTER (WHERE d.currency IS NOT NULL) AS currencies,
      min(d.amount)::float8 AS min_amount,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY d.amount)::float8 AS median_amount,
      max(d.amount)::float8 AS max_amount
    FROM deals d
    JOIN entities e ON e.id = d.entity_id AND e.status = 'active'
    JOIN entity_classifications c ON c.entity_id = d.entity_id AND c.status = 'approved'
    WHERE d.amount IS NOT NULL
    GROUP BY c.asset_class
    ORDER BY deal_count DESC, c.asset_class
  `);
  return result.rows.map((row) => ({
    assetClass: String(row.asset_class),
    dealCount: Number(row.deal_count),
    currencies: (row.currencies as string[] | null) ?? [],
    minAmount: Number(row.min_amount),
    medianAmount: Number(row.median_amount),
    maxAmount: Number(row.max_amount),
  }));
}

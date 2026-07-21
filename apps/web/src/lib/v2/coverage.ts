import { MOCK_ENTITIES, mockFacts } from "@continuum/shared";
import { V2_CLASSES, v2StrategiesFor, type V2AssetClass } from "./taxonomy";

/**
 * FRONTEND-V2 coverage fixtures. The platform-wide aggregates (30,500
 * entities / 39 countries) are REAL numbers; the per-class/per-strategy
 * splits below are deterministic PROTOTYPE fixtures that sum to the real
 * total — at cutover they are replaced by strategyCoverage() from
 * @continuum/db. Active/Building states are honest to the prototype: a
 * strategy is Active only where the mock layer actually renders content.
 */

export const TOTAL_ENTITIES = 30500;
export const TOTAL_COUNTRIES = 39;

/** Fixture per-class entity counts — sum exactly 30,500. */
export const CLASS_ENTITY_COUNTS: Record<string, number> = {
  "private-equity": 7400,
  "private-credit": 6900,
  "real-assets": 4800,
  "hedge-funds": 3200,
  structured: 2600,
  esoteric: 1400,
  collectibles: 900,
  climate: 1600,
  digital: 1700,
};

export type CoverageRow = {
  cls: V2AssetClass;
  strategySlug: string;
  strategyLabel: string;
  entities: number;
  signals: number;
  /** Active = the prototype actually renders content for it. */
  active: boolean;
};

function seededShare(key: string): number {
  let h = 0;
  for (const ch of key) {
    h = (h * 33 + ch.charCodeAt(0)) % 9973;
  }
  return 0.5 + (h % 1000) / 1000; // 0.5 .. 1.5
}

let cache: CoverageRow[] | null = null;

export function coverageRows(): CoverageRow[] {
  if (cache !== null) {
    return cache;
  }
  const facts = mockFacts();
  const rows: CoverageRow[] = [];
  for (const cls of V2_CLASSES) {
    const strategies = v2StrategiesFor(cls.slug);
    const weights = strategies.map((s) => seededShare(`${cls.slug}:${s.slug}`));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const classTotal = CLASS_ENTITY_COUNTS[cls.slug] ?? 0;
    strategies.forEach((s, i) => {
      const entities = Math.round((classTotal * weights[i]!) / weightSum);
      const mockEntities = MOCK_ENTITIES.filter(
        (e) => e.assetClass === cls.slug && e.strategySlug === s.slug,
      );
      const signals = facts.filter((f) =>
        mockEntities.some((e) => e.id === f.entityId),
      ).length;
      rows.push({
        cls,
        strategySlug: s.slug,
        strategyLabel: s.label,
        entities,
        signals,
        active: mockEntities.length > 0,
      });
    });
  }
  cache = rows;
  return cache;
}

export function classCoverage(classSlug: string): {
  entities: number;
  signals: number;
  strategies: number;
  activeStrategies: number;
  countries: number;
} {
  const rows = coverageRows().filter((r) => r.cls.slug === classSlug);
  const classEntities = MOCK_ENTITIES.filter((e) => e.assetClass === classSlug);
  return {
    entities: CLASS_ENTITY_COUNTS[classSlug] ?? 0,
    signals: rows.reduce((n, r) => n + r.signals, 0),
    strategies: rows.length,
    activeStrategies: rows.filter((r) => r.active).length,
    countries: new Set(classEntities.map((e) => e.country)).size,
  };
}

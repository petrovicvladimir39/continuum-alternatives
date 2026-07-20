import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import { entities } from "../schema";
import type { EntityKind } from "./entities";

/**
 * Tag → capital-type mapping. THE single source of truth for map coloring:
 *   equity     ⊇ {gp_vc, gp_pe, cvc, startup, scaleup, angel, angel_network,
 *                 gp_secondaries, gp_search_fund}
 *   credit     ⊇ {bank, non_bank_lender, leasing, factoring, gp_credit}
 *   distressed ⊇ {servicer, gp_distressed, insolvency_practitioner, state_amc,
 *                 bank_workout_unit, collection_agency}
 * Anything unmapped contributes nothing; an entity with no mapped tag is
 * "neutral". Multiple capital types are allowed and preserved.
 */
export const CAPITAL_TYPE_TAGS = {
  equity: [
    "gp_vc",
    "gp_pe",
    "cvc",
    "startup",
    "scaleup",
    "angel",
    "angel_network",
    "gp_secondaries",
    "gp_search_fund",
  ],
  credit: ["bank", "non_bank_lender", "leasing", "factoring", "gp_credit"],
  distressed: [
    "servicer",
    "gp_distressed",
    "insolvency_practitioner",
    "state_amc",
    "bank_workout_unit",
    "collection_agency",
  ],
} as const;

export type CapitalType = keyof typeof CAPITAL_TYPE_TAGS | "neutral";

/**
 * Capital types for one entity's tags, ordered by dominance: most matching
 * tags first; ties break distressed > credit > equity (the more specialized
 * activity wins the dot color). Empty result means neutral.
 */
export function capitalTypesFor(tags: string[]): CapitalType[] {
  const tagSet = new Set(tags);
  const priority: Record<string, number> = { distressed: 3, credit: 2, equity: 1 };
  const scored = (Object.keys(CAPITAL_TYPE_TAGS) as (keyof typeof CAPITAL_TYPE_TAGS)[])
    .map((type) => ({
      type,
      matches: CAPITAL_TYPE_TAGS[type].filter((tag) => tagSet.has(tag)).length,
    }))
    .filter((entry) => entry.matches > 0)
    .sort(
      (a, b) => b.matches - a.matches || (priority[b.type] ?? 0) - (priority[a.type] ?? 0),
    );
  return scored.map((entry) => entry.type);
}

export type MapEntity = {
  id: string;
  slug: string;
  name: string;
  kind: EntityKind;
  country: string | null;
  lat: number;
  lng: number;
  capitalTypes: CapitalType[];
  factsCount: number;
};

/** All active geocoded entities, compact — the /map payload. */
export async function listMapEntities(): Promise<MapEntity[]> {
  const result = await db.execute(sql`
    select e.id, e.slug, e.name, e.kind, e.country,
      ST_Y(e.geo::geometry) as lat,
      ST_X(e.geo::geometry) as lng,
      coalesce(array_agg(distinct t.tag) filter (where t.tag is not null), '{}') as tags,
      (select count(*)::int from timeline_facts tf
        where tf.entity_id = e.id and tf.status = 'approved') as facts_count
    from entities e
    left join entity_tags t on t.entity_id = e.id
    where e.status = 'active' and e.geo is not null
    group by e.id
    order by e.name
  `);
  return result.rows.map((row) => {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    const capitalTypes = capitalTypesFor(tags);
    return {
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      kind: String(row.kind) as EntityKind,
      country: row.country === null ? null : String(row.country),
      lat: Number(row.lat),
      lng: Number(row.lng),
      capitalTypes: capitalTypes.length === 0 ? ["neutral"] : capitalTypes,
      factsCount: Number(row.facts_count),
    };
  });
}

/** Active entities with NO geo — excluded from dots, surfaced in the map's UI note. */
export async function countActiveWithoutGeo(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(entities)
    .where(and(eq(entities.status, "active"), isNull(entities.geo)));
  return rows[0]?.n ?? 0;
}

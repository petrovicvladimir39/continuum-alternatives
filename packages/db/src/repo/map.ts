import { transliterateDisplay } from "@continuum/shared";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import { entities } from "../schema";
import type { EdgeTypeName } from "./edges";
import type { EntityKind } from "./entities";
import { EDGE_PHRASES, publicPathFor } from "./public";

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
    .sort((a, b) => b.matches - a.matches || (priority[b.type] ?? 0) - (priority[a.type] ?? 0));
  return scored.map((entry) => entry.type);
}

/**
 * Edge-type → capital group, coloring connection lines on the map and edges
 * of the profile connections graph. Advisory/governance edges are "neutral".
 */
export const EDGE_TYPE_GROUPS: Record<EdgeTypeName, CapitalType> = {
  invested_in: "equity",
  acquired: "equity",
  divested: "equity",
  founded: "equity",
  incubated: "equity",
  co_invested_with: "equity",
  lp_in: "equity",
  manages: "equity",
  lent_to: "credit",
  originated: "credit",
  pledged_collateral_for: "credit",
  serviced_by: "distressed",
  sold_portfolio_to: "distressed",
  litigated_against: "distressed",
  advised_on: "neutral",
  audits: "neutral",
  values: "neutral",
  employed_by: "neutral",
  board_member_of: "neutral",
  regulated_by: "neutral",
  sponsored: "neutral",
  attended: "neutral",
};

export type CapitalTypeCounts = Record<CapitalType, number>;

export type MapEntity = {
  id: string;
  slug: string;
  name: string;
  kind: EntityKind;
  country: string | null;
  cityKey: string;
  capitalTypes: CapitalType[];
  factsCount: number;
  logoUrl: string | null;
};

export type MapCity = {
  key: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  capitalTypeCounts: CapitalTypeCounts;
  /** max of capitalTypeCounts; ties break distressed > credit > equity > neutral */
  dominant: CapitalType;
  entityIds: string[];
};

export type MapData = {
  cities: MapCity[];
  entities: MapEntity[];
  countries: number;
};

/** Pure city-dominance rule, exported for verification. */
export function dominantOf(counts: CapitalTypeCounts): CapitalType {
  const priority: Record<CapitalType, number> = {
    distressed: 3,
    credit: 2,
    equity: 1,
    neutral: 0,
  };
  return (Object.keys(counts) as CapitalType[]).reduce((best, type) =>
    counts[type] > counts[best] || (counts[type] === counts[best] && priority[type] > priority[best])
      ? type
      : best,
  );
}

/** Pure aggregation core, exported for verification: entity rows → city features. */
export function aggregateCities(
  rows: {
    id: string;
    country: string;
    city: string;
    lat: number;
    lng: number;
    dominantType: CapitalType;
  }[],
): MapCity[] {
  // Group by country + coords rounded to ~100m: "Belgrade" (curated) and
  // "Београд" (registry) geocode to the same point and must be ONE city dot.
  type CityGroup = {
    rows: { id: string; lat: number; lng: number; dominantType: CapitalType }[];
    names: Map<string, number>;
    country: string;
  };
  const groups = new Map<string, CityGroup>();
  for (const row of rows) {
    const key = `${row.country}:${row.lat.toFixed(3)}:${row.lng.toFixed(3)}`;
    const group: CityGroup = groups.get(key) ?? {
      rows: [],
      names: new Map<string, number>(),
      country: row.country,
    };
    group.rows.push(row);
    group.names.set(row.city, (group.names.get(row.city) ?? 0) + 1);
    groups.set(key, group);
  }
  const cities: MapCity[] = [];
  for (const [key, group] of groups) {
    const counts: CapitalTypeCounts = { equity: 0, credit: 0, distressed: 0, neutral: 0 };
    for (const row of group.rows) {
      counts[row.dominantType] += 1;
    }
    // Display name = most frequent spelling, transliterated for the Latin UI.
    const displayRaw = [...group.names.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]?.[0];
    const first = group.rows[0];
    if (first === undefined || displayRaw === undefined) {
      continue;
    }
    cities.push({
      key,
      city: transliterateDisplay(displayRaw),
      country: group.country,
      lat: first.lat,
      lng: first.lng,
      count: group.rows.length,
      capitalTypeCounts: counts,
      dominant: dominantOf(counts),
      entityIds: group.rows.map((row) => row.id),
    });
  }
  return cities.sort((a, b) => b.count - a.count);
}

/**
 * The /map payload: one feature per city (aggregated) plus the compact entity
 * list that powers the city panel. City name uses the same precedence as the
 * geocode backfill: organizations.hq_city, else the latest fact city/place.
 */
export async function listMapData(): Promise<MapData> {
  const result = await db.execute(sql`
    select e.id, e.slug, e.name, e.kind, e.country,
      ST_Y(e.geo::geometry) as lat,
      ST_X(e.geo::geometry) as lng,
      o.logo_url,
      coalesce(o.hq_city, (
        select coalesce(tf.data->>'city', tf.data->>'place')
          from timeline_facts tf
         where tf.entity_id = e.id
           and coalesce(tf.data->>'city', tf.data->>'place') is not null
         order by tf.occurred_on desc, tf.recorded_at desc
         limit 1)) as city,
      coalesce((select array_agg(distinct t.tag) from entity_tags t where t.entity_id = e.id), '{}') as tags,
      (select count(*)::int from timeline_facts tf
        where tf.entity_id = e.id and tf.status = 'approved') as facts_count
    from entities e
    left join organizations o on o.entity_id = e.id
    where e.status = 'active' and e.geo is not null
    order by e.name
  `);

  const aggregationRows: Parameters<typeof aggregateCities>[0] = [];
  const mapEntities: MapEntity[] = [];
  const countries = new Set<string>();
  for (const row of result.rows) {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    const capitalTypes = capitalTypesFor(tags);
    const country = row.country === null ? "??" : String(row.country);
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    countries.add(country);
    aggregationRows.push({
      id: String(row.id),
      country,
      city: row.city === null || row.city === undefined ? "Unknown" : String(row.city),
      lat,
      lng,
      dominantType: capitalTypes[0] ?? "neutral",
    });
    mapEntities.push({
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      kind: String(row.kind) as EntityKind,
      country: row.country === null ? null : String(row.country),
      cityKey: `${country}:${lat.toFixed(3)}:${lng.toFixed(3)}`,
      capitalTypes: capitalTypes.length === 0 ? ["neutral"] : capitalTypes,
      factsCount: Number(row.facts_count),
      logoUrl: row.logo_url === null || row.logo_url === undefined ? null : String(row.logo_url),
    });
  }

  return {
    cities: aggregateCities(aggregationRows),
    entities: mapEntities,
    countries: countries.size,
  };
}

/** Active entities with NO geo — excluded from dots, surfaced in the map's UI note. */
export async function countActiveWithoutGeo(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(entities)
    .where(and(eq(entities.status, "active"), isNull(entities.geo)));
  return rows[0]?.n ?? 0;
}

export type MapEntityCard = {
  id: string;
  slug: string;
  name: string;
  kind: EntityKind;
  country: string | null;
  capitalTypes: CapitalType[];
  logoUrl: string | null;
  href: string | null;
  factsCount: number;
  connectionsCount: number;
  firstSeenYear: number | null;
  latestFact: { title: string; occurredOn: string; sourceName: string | null } | null;
  connections: { phrase: string; name: string; href: string | null }[];
  /** Geocoded active counterparties for the on-map connection lines. */
  lines: { toLat: number; toLng: number; group: CapitalType }[];
  lat: number | null;
  lng: number | null;
};

/** Everything the in-map entity card needs. Null for unknown/non-active ids. */
export async function getMapEntityCard(id: string): Promise<MapEntityCard | null> {
  const base = await db.execute(sql`
    select e.id, e.slug, e.name, e.kind, e.country,
      ST_Y(e.geo::geometry) as lat, ST_X(e.geo::geometry) as lng,
      o.logo_url,
      coalesce((select array_agg(distinct t.tag) from entity_tags t where t.entity_id = e.id), '{}') as tags,
      (select count(*)::int from timeline_facts tf
        where tf.entity_id = e.id and tf.status = 'approved') as facts_count,
      (select min(tf.occurred_on) from timeline_facts tf
        where tf.entity_id = e.id and tf.status = 'approved') as first_seen
    from entities e
    left join organizations o on o.entity_id = e.id
    where e.id = ${id} and e.status = 'active'
  `);
  const row = base.rows[0];
  if (row === undefined) {
    return null;
  }
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  const capitalTypes = capitalTypesFor(tags);
  const kind = String(row.kind) as EntityKind;

  const latestResult = await db.execute(sql`
    select tf.title, tf.occurred_on, s.name as source_name
    from timeline_facts tf
    left join documents d on d.id = tf.source_document_id
    left join sources s on s.id = d.source_id
    where tf.entity_id = ${id} and tf.status = 'approved'
    order by tf.occurred_on desc, tf.recorded_at desc
    limit 1
  `);
  const latest = latestResult.rows[0];

  const edgeResult = await db.execute(sql`
    select ed.edge_type,
      case when ed.source_entity_id = ${id} then 'out' else 'in' end as direction,
      c.name as counterpart_name, c.slug as counterpart_slug, c.kind as counterpart_kind,
      c.status as counterpart_status,
      ST_Y(c.geo::geometry) as to_lat, ST_X(c.geo::geometry) as to_lng
    from edges ed
    join entities c on c.id = case when ed.source_entity_id = ${id} then ed.target_entity_id else ed.source_entity_id end
    where ed.status = 'approved'
      and (ed.source_entity_id = ${id} or ed.target_entity_id = ${id})
    order by ed.created_at
  `);

  const connections: MapEntityCard["connections"] = [];
  const lines: MapEntityCard["lines"] = [];
  for (const edge of edgeResult.rows) {
    const edgeType = String(edge.edge_type) as EdgeTypeName;
    const direction = String(edge.direction) as "out" | "in";
    const counterpartKind = String(edge.counterpart_kind) as EntityKind;
    const active = String(edge.counterpart_status) === "active";
    if (connections.length < 3) {
      connections.push({
        phrase: EDGE_PHRASES[edgeType][direction],
        name: String(edge.counterpart_name),
        href: active ? publicPathFor(counterpartKind, String(edge.counterpart_slug)) : null,
      });
    }
    if (edge.to_lat !== null && edge.to_lat !== undefined && active) {
      lines.push({
        toLat: Number(edge.to_lat),
        toLng: Number(edge.to_lng),
        group: EDGE_TYPE_GROUPS[edgeType],
      });
    }
  }

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    kind,
    country: row.country === null ? null : String(row.country),
    capitalTypes: capitalTypes.length === 0 ? ["neutral"] : capitalTypes,
    logoUrl: row.logo_url === null || row.logo_url === undefined ? null : String(row.logo_url),
    href: publicPathFor(kind, String(row.slug)),
    factsCount: Number(row.facts_count),
    connectionsCount: edgeResult.rows.length,
    firstSeenYear:
      row.first_seen === null || row.first_seen === undefined
        ? null
        : Number(String(row.first_seen).slice(0, 4)),
    latestFact:
      latest === undefined
        ? null
        : {
            title: String(latest.title),
            occurredOn: String(latest.occurred_on).slice(0, 10),
            sourceName:
              latest.source_name === null || latest.source_name === undefined
                ? null
                : String(latest.source_name),
          },
    connections,
    lines,
    lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
  };
}

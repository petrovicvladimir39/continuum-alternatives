import { mockFeedPage, mockModeEnabled, normalizeAlias } from "@continuum/shared";
import { and, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "../client";
import { documents, entities, sources, timelineFacts } from "../schema";
import type { EntityKind } from "./entities";
import { publicPathFor } from "./public";

/**
 * Phase 18 read layer: public feed, auction tracker, league tables, homepage
 * stats. Approved data only; every list is a live query — at the current scale
 * (<1k facts) that is nightly-fresh by construction. Revisit with materialized
 * views once timeline_facts passes ~50k rows.
 */

export const FEED_PAGE_SIZE = 25;

export type FeedItem = {
  id: string;
  occurredOn: string;
  /** ISO datetime the fact entered the record — drives relative timestamps.
   * Optional: other FeedItem producers (ask, leads) don't carry it. */
  recordedAtIso?: string | null;
  title: string;
  factType: string;
  channels: string[];
  /** Optional one-line context under the headline (fact body / mock context). */
  contextLine?: string | null;
  entityName: string;
  entitySlug: string;
  entityKind: EntityKind;
  entityCountry: string | null;
  entityCity?: string | null;
  /** Taxonomy class slug when known (mock always; real when classified). */
  entityAssetClass?: string | null;
  entityHref: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
};

export type FeedPage = {
  items: FeedItem[];
  total: number;
  page: number;
  pageCount: number;
  /** recorded_at of the newest item in the filtered set — honest "Updated". */
  updatedAt: string | null;
};

export async function listFeed(
  opts: {
    channel?: string;
    country?: string;
    factType?: string;
    /** Multi-select fact-type filter (chip row); wins over factType when set. */
    factTypes?: string[];
    page?: number;
    /** MOCK MODE (design scaffolding): per-call override of NEXT_PUBLIC_MOCK_MODE. */
    mock?: boolean;
  } = {},
): Promise<FeedPage> {
  // ── MOCK MODE: fixture return, same shape — pages never change when the
  //    flag flips (see @continuum/shared mock/ and README).
  if (mockModeEnabled(opts.mock)) {
    const mock = mockFeedPage({
      ...(opts.factTypes !== undefined ? { factTypes: opts.factTypes } : {}),
      ...(opts.channel !== undefined && opts.channel !== "" ? { channel: opts.channel } : {}),
      ...(opts.country !== undefined && opts.country !== "" ? { country: opts.country } : {}),
      ...(opts.page !== undefined ? { page: opts.page } : {}),
      pageSize: FEED_PAGE_SIZE,
    });
    return {
      items: mock.items.map(({ recordedAt, ...item }) => ({ ...item, recordedAtIso: recordedAt, entityKind: item.entityKind as EntityKind })),
      total: mock.total,
      page: mock.page,
      pageCount: mock.pageCount,
      updatedAt: mock.updatedAt,
    };
  }

  const page = Math.max(1, opts.page ?? 1);
  const conditions = [eq(timelineFacts.status, "approved")];
  if (opts.channel !== undefined && opts.channel !== "") {
    conditions.push(sql`${timelineFacts.audienceChannels} @> ARRAY[${opts.channel}]::text[]`);
  }
  if (opts.country !== undefined && opts.country !== "") {
    conditions.push(eq(entities.country, opts.country));
  }
  if (opts.factTypes !== undefined && opts.factTypes.length > 0) {
    conditions.push(inArray(timelineFacts.factType, opts.factTypes));
  } else if (opts.factType !== undefined && opts.factType !== "") {
    conditions.push(eq(timelineFacts.factType, opts.factType));
  }
  const where = and(...conditions);

  const totalRows = await db
    .select({ n: count() })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .where(where);
  const total = totalRows[0]?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));

  const rows = await db
    .select({
      id: timelineFacts.id,
      occurredOn: timelineFacts.occurredOn,
      recordedAt: timelineFacts.recordedAt,
      title: timelineFacts.title,
      body: timelineFacts.body,
      factType: timelineFacts.factType,
      channels: timelineFacts.audienceChannels,
      entityName: entities.name,
      entitySlug: entities.slug,
      entityKind: entities.kind,
      entityCountry: entities.country,
      entityStatus: entities.status,
      sourceName: sources.name,
      sourceUrl: documents.url,
    })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .leftJoin(documents, eq(documents.id, timelineFacts.sourceDocumentId))
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(where)
    .orderBy(desc(timelineFacts.occurredOn), desc(timelineFacts.recordedAt))
    .limit(FEED_PAGE_SIZE)
    .offset((page - 1) * FEED_PAGE_SIZE);

  return {
    items: rows.map((row) => ({
      id: row.id,
      occurredOn: row.occurredOn,
      recordedAtIso: row.recordedAt?.toISOString() ?? null,
      title: row.title,
      factType: row.factType,
      channels: row.channels,
      contextLine: row.body,
      entityName: row.entityName,
      entitySlug: row.entitySlug,
      entityKind: row.entityKind,
      entityCountry: row.entityCountry,
      entityCity: null,
      entityAssetClass: null,
      entityHref:
        row.entityStatus === "active" ? publicPathFor(row.entityKind, row.entitySlug) : null,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
    })),
    total,
    page,
    pageCount,
    updatedAt: rows[0]?.recordedAt?.toISOString() ?? null,
  };
}

export async function feedFilterOptions(
  opts: { mock?: boolean } = {},
): Promise<{ countries: string[]; factTypes: string[] }> {
  if (mockModeEnabled(opts.mock)) {
    const mock = mockFeedPage({ pageSize: 1000 });
    return {
      countries: [...new Set(mock.items.map((i) => i.entityCountry).filter((c): c is string => c !== null))].sort(),
      factTypes: [...new Set(mock.items.map((i) => i.factType))].sort(),
    };
  }
  const countryRows = await db
    .selectDistinct({ country: entities.country })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .where(eq(timelineFacts.status, "approved"));
  const typeRows = await db
    .selectDistinct({ factType: timelineFacts.factType })
    .from(timelineFacts)
    .where(eq(timelineFacts.status, "approved"));
  return {
    countries: countryRows
      .map((row) => row.country)
      .filter((value): value is string => value !== null)
      .sort(),
    factTypes: typeRows.map((row) => row.factType).sort(),
  };
}

// ── Auctions ────────────────────────────────────────────────────────────────

export const AUCTION_PAGE_SIZE = 25;

/**
 * Value display rule (exported pure for verification) — NEVER fake:
 *   numeric estimatedValue present → {kind:'numeric'} (formatted downstream in
 *   the registry's own currency, RSD for ALSU — the source states dinars, so
 *   we do NOT relabel them as €);
 *   raw estimatedValueText only    → {kind:'raw'} verbatim;
 *   neither                        → {kind:'none'} rendered as "—".
 */
export type AuctionValue =
  | { kind: "numeric"; value: number }
  | { kind: "raw"; text: string }
  | { kind: "none" };

export function auctionValueOf(data: unknown): AuctionValue {
  const record = (data ?? {}) as Record<string, unknown>;
  if (typeof record.estimatedValue === "number") {
    return { kind: "numeric", value: record.estimatedValue };
  }
  if (typeof record.estimatedValueText === "string" && record.estimatedValueText !== "") {
    return { kind: "raw", text: record.estimatedValueText };
  }
  return { kind: "none" };
}

/** Whole days from today until date (both ISO yyyy-mm-dd); negative = past. */
export function daysUntil(date: string, today: string): number {
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export type AuctionRow = {
  factId: string;
  saleDate: string;
  daysUntil: number;
  debtorName: string;
  debtorHref: string | null;
  method: string | null;
  place: string | null;
  value: AuctionValue;
  court: string | null;
};

export type AuctionList = {
  rows: AuctionRow[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * Upcoming: sale date ≥ today, soonest first (unpaginated — the near horizon).
 * Past: archive, newest first, paginated. `today` is injectable for tests.
 * Court comes from the debtor's insolvency_opened filing (sale facts don't
 * carry it) — same registry, same entity.
 */
export async function listAuctions(
  tab: "upcoming" | "past",
  opts: { page?: number; today?: string } = {},
): Promise<AuctionList> {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const page = Math.max(1, opts.page ?? 1);
  const base = and(
    eq(timelineFacts.status, "approved"),
    eq(timelineFacts.factType, "asset_sale_announced"),
    tab === "upcoming" ? gte(timelineFacts.occurredOn, today) : lt(timelineFacts.occurredOn, today),
  );

  const totalRows = await db.select({ n: count() }).from(timelineFacts).where(base);
  const total = totalRows[0]?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / AUCTION_PAGE_SIZE));

  const query = db
    .select({
      factId: timelineFacts.id,
      saleDate: timelineFacts.occurredOn,
      data: timelineFacts.data,
      debtorName: entities.name,
      debtorSlug: entities.slug,
      debtorKind: entities.kind,
      debtorStatus: entities.status,
      court: sql<string | null>`(
        select insolvency.data->>'court' from timeline_facts insolvency
        where insolvency.entity_id = ${timelineFacts.entityId}
          and insolvency.fact_type = 'insolvency_opened'
          and insolvency.status = 'approved'
          and insolvency.data->>'court' is not null
        order by insolvency.occurred_on desc limit 1
      )`,
    })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .where(base)
    .orderBy(
      tab === "upcoming" ? timelineFacts.occurredOn : desc(timelineFacts.occurredOn),
      desc(timelineFacts.recordedAt),
    );

  const rows =
    tab === "past"
      ? await query.limit(AUCTION_PAGE_SIZE).offset((page - 1) * AUCTION_PAGE_SIZE)
      : await query;

  return {
    rows: rows.map((row) => {
      const data = (row.data ?? {}) as Record<string, unknown>;
      return {
        factId: row.factId,
        saleDate: row.saleDate,
        daysUntil: daysUntil(row.saleDate, today),
        debtorName: row.debtorName,
        debtorHref:
          row.debtorStatus === "active" ? publicPathFor(row.debtorKind, row.debtorSlug) : null,
        method: typeof data.method === "string" ? data.method : null,
        place: typeof data.place === "string" ? data.place : null,
        value: auctionValueOf(row.data),
        court: row.court,
      };
    }),
    total,
    page,
    pageCount,
  };
}

export type AuctionStats = {
  upcoming: number;
  nextSevenDays: number;
  totalTracked: number;
  withValue: number;
};

export async function auctionStats(today?: string): Promise<AuctionStats> {
  const anchor = today ?? new Date().toISOString().slice(0, 10);
  const result = await db.execute(sql`
    select
      count(*) filter (where occurred_on >= ${anchor})::int as upcoming,
      count(*) filter (where occurred_on >= ${anchor}
        and occurred_on < (${anchor}::date + interval '7 days'))::int as next7,
      count(*)::int as total,
      count(*) filter (where (data->>'estimatedValue') is not null
        or coalesce(data->>'estimatedValueText', '') <> '')::int as with_value
    from timeline_facts
    where status = 'approved' and fact_type = 'asset_sale_announced'
  `);
  const row = result.rows[0] ?? {};
  return {
    upcoming: Number(row.upcoming ?? 0),
    nextSevenDays: Number(row.next7 ?? 0),
    totalTracked: Number(row.total ?? 0),
    withValue: Number(row.with_value ?? 0),
  };
}

// ── League tables (trailing 12 months, live queries) ───────────────────────
//
// Phase 34A: an `asof` date shifts the whole window — facts must have
// OCCURRED in the 12 months up to asof AND been RECORDED by asof (both
// bitemporal dimensions; a later backfill never rewrites a past table).

export type RankingRow = { label: string; n: number; href?: string | null };

function rankingWindow(asof?: string) {
  const end = asof ?? null;
  return sql`
      f.occurred_on <= coalesce(${end}::date, current_date)
      and f.occurred_on >= coalesce(${end}::date, current_date) - interval '12 months'
      and coalesce(f.recorded_at, f.occurred_on::timestamptz)::date <= coalesce(${end}::date, current_date)`;
}

export async function courtRanking(
  limit = 10,
  country?: string,
  asof?: string,
): Promise<RankingRow[]> {
  const result = await db.execute(sql`
    select f.data->>'court' as label, count(*)::int as n
    from timeline_facts f
    join entities e on e.id = f.entity_id
    where f.status = 'approved' and f.fact_type = 'insolvency_opened'
      and f.data->>'court' is not null
      and ${rankingWindow(asof)}
      and (${country ?? null}::text is null or e.country = ${country ?? null})
    group by 1 order by n desc, label limit ${limit}
  `);
  return result.rows.map((row) => ({ label: String(row.label), n: Number(row.n) }));
}

export async function cityRanking(
  limit = 10,
  country?: string,
  asof?: string,
): Promise<RankingRow[]> {
  const result = await db.execute(sql`
    select coalesce(f.data->>'city', f.data->>'place') as label, count(*)::int as n
    from timeline_facts f
    join entities e on e.id = f.entity_id
    where f.status = 'approved'
      and coalesce(f.data->>'city', f.data->>'place') is not null
      and ${rankingWindow(asof)}
      and (${country ?? null}::text is null or e.country = ${country ?? null})
    group by 1 order by n desc, label limit ${limit}
  `);
  return result.rows.map((row) => ({ label: String(row.label), n: Number(row.n) }));
}

/**
 * Pure grouping core for the administrators table (exported for verification):
 * groups case counts by normalizeAlias(name) so spelling/script variants merge,
 * displays the most frequent raw spelling, and drops groups under `min` cases.
 */
export function groupAdministrators(
  rows: { name: string; n: number }[],
  min = 2,
): RankingRow[] {
  const groups = new Map<string, { display: Map<string, number>; n: number }>();
  for (const row of rows) {
    const key = normalizeAlias(row.name);
    if (key === "") {
      continue;
    }
    const group = groups.get(key) ?? { display: new Map<string, number>(), n: 0 };
    group.n += row.n;
    group.display.set(row.name, (group.display.get(row.name) ?? 0) + row.n);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.n >= min)
    .map((group) => ({
      label: [...group.display.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
      n: group.n,
    }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}

export async function administratorRanking(
  limit = 10,
  country?: string,
  asof?: string,
): Promise<RankingRow[]> {
  const result = await db.execute(sql`
    select f.data->>'administrator' as name, count(*)::int as n
    from timeline_facts f
    join entities e on e.id = f.entity_id
    where f.status = 'approved' and f.data->>'administrator' is not null
      and ${rankingWindow(asof)}
      and (${country ?? null}::text is null or e.country = ${country ?? null})
    group by 1
  `);
  return groupAdministrators(
    result.rows.map((row) => ({ name: String(row.name), n: Number(row.n) })),
  ).slice(0, limit);
}

export async function degreeRanking(
  limit = 20,
  country?: string,
  asof?: string,
): Promise<RankingRow[]> {
  const result = await db.execute(sql`
    select e.name as label, e.slug, e.kind, count(*)::int as n
    from entities e
    join edges ed on ed.status = 'approved'
      and (ed.source_entity_id = e.id or ed.target_entity_id = e.id)
      and coalesce(ed.created_at, now())::date <= coalesce(${asof ?? null}::date, current_date)
      and (ed.started_on is null or ed.started_on <= coalesce(${asof ?? null}::date, current_date))
    where e.status = 'active'
      and (${country ?? null}::text is null or e.country = ${country ?? null})
    group by e.id, e.name, e.slug, e.kind
    order by n desc, e.name limit ${limit}
  `);
  return result.rows.map((row) => ({
    label: String(row.label),
    n: Number(row.n),
    href: publicPathFor(String(row.kind) as EntityKind, String(row.slug)),
  }));
}

// ── Homepage front-page queries ─────────────────────────────────────────────

export type LeadCandidate = FeedItem & {
  confidence: string;
  excerpt: string | null;
  recordedAt: Date | null;
};

/** Approved facts of the trailing 7 days — the lead-story pool (web ranks by priority). */
export async function leadCandidates(): Promise<LeadCandidate[]> {
  const rows = await db
    .select({
      id: timelineFacts.id,
      occurredOn: timelineFacts.occurredOn,
      recordedAt: timelineFacts.recordedAt,
      title: timelineFacts.title,
      factType: timelineFacts.factType,
      channels: timelineFacts.audienceChannels,
      confidence: timelineFacts.confidence,
      excerpt: sql<string | null>`${timelineFacts.data}->>'excerpt_original'`,
      entityName: entities.name,
      entitySlug: entities.slug,
      entityKind: entities.kind,
      entityCountry: entities.country,
      entityStatus: entities.status,
      sourceName: sources.name,
      sourceUrl: documents.url,
    })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .leftJoin(documents, eq(documents.id, timelineFacts.sourceDocumentId))
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(
      and(
        eq(timelineFacts.status, "approved"),
        sql`${timelineFacts.occurredOn} >= current_date - interval '7 days'`,
        sql`${timelineFacts.occurredOn} <= current_date`,
      ),
    );
  return rows.map((row) => ({
    id: row.id,
    occurredOn: row.occurredOn,
    recordedAt: row.recordedAt,
    title: row.title,
    factType: row.factType,
    channels: row.channels,
    confidence: row.confidence,
    excerpt: row.excerpt,
    entityName: row.entityName,
    entitySlug: row.entitySlug,
    entityKind: row.entityKind,
    entityCountry: row.entityCountry,
    entityHref:
      row.entityStatus === "active" ? publicPathFor(row.entityKind, row.entitySlug) : null,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
  }));
}

export type RecordedFeedItem = FeedItem & { recordedAt: Date | null };

/** Latest N by ingestion time — the Bloomberg right rail ("2h ago"). */
export async function latestRecorded(limit = 8): Promise<RecordedFeedItem[]> {
  const rows = await db
    .select({
      id: timelineFacts.id,
      occurredOn: timelineFacts.occurredOn,
      recordedAt: timelineFacts.recordedAt,
      title: timelineFacts.title,
      factType: timelineFacts.factType,
      channels: timelineFacts.audienceChannels,
      entityName: entities.name,
      entitySlug: entities.slug,
      entityKind: entities.kind,
      entityCountry: entities.country,
      entityStatus: entities.status,
      sourceName: sources.name,
      sourceUrl: documents.url,
    })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .leftJoin(documents, eq(documents.id, timelineFacts.sourceDocumentId))
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(eq(timelineFacts.status, "approved"))
    .orderBy(desc(timelineFacts.recordedAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    occurredOn: row.occurredOn,
    recordedAt: row.recordedAt,
    title: row.title,
    factType: row.factType,
    channels: row.channels,
    entityName: row.entityName,
    entitySlug: row.entitySlug,
    entityKind: row.entityKind,
    entityCountry: row.entityCountry,
    entityHref:
      row.entityStatus === "active" ? publicPathFor(row.entityKind, row.entitySlug) : null,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
  }));
}

/** Five latest items for one channel group (array-overlap match). */
export async function channelColumn(channels: string[], limit = 5): Promise<FeedItem[]> {
  const page = await listFeedForChannels(channels, limit);
  return page;
}

async function listFeedForChannels(channels: string[], limit: number): Promise<FeedItem[]> {
  const rows = await db
    .select({
      id: timelineFacts.id,
      occurredOn: timelineFacts.occurredOn,
      title: timelineFacts.title,
      factType: timelineFacts.factType,
      channels: timelineFacts.audienceChannels,
      entityName: entities.name,
      entitySlug: entities.slug,
      entityKind: entities.kind,
      entityCountry: entities.country,
      entityStatus: entities.status,
      sourceName: sources.name,
      sourceUrl: documents.url,
    })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .leftJoin(documents, eq(documents.id, timelineFacts.sourceDocumentId))
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(
      and(
        eq(timelineFacts.status, "approved"),
        sql`${timelineFacts.audienceChannels} && ${sql.raw(`ARRAY[${channels.map((c) => `'${c.replace(/'/g, "''")}'`).join(",")}]::text[]`)}`,
      ),
    )
    .orderBy(desc(timelineFacts.occurredOn), desc(timelineFacts.recordedAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    occurredOn: row.occurredOn,
    title: row.title,
    factType: row.factType,
    channels: row.channels,
    entityName: row.entityName,
    entitySlug: row.entitySlug,
    entityKind: row.entityKind,
    entityCountry: row.entityCountry,
    entityHref:
      row.entityStatus === "active" ? publicPathFor(row.entityKind, row.entitySlug) : null,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
  }));
}

// ── Report data (Serbian Insolvency Monitor) ────────────────────────────────

export type MonthlyCount = { month: string; n: number };

/** Monthly insolvency_opened counts, trailing 12 months (chart input). */
export async function monthlyFilings(): Promise<MonthlyCount[]> {
  const result = await db.execute(sql`
    select to_char(occurred_on, 'YYYY-MM') as month, count(*)::int as n
    from timeline_facts
    where status = 'approved' and fact_type = 'insolvency_opened'
      and occurred_on >= date_trunc('month', current_date) - interval '11 months'
    group by 1 order by 1
  `);
  return result.rows.map((row) => ({ month: String(row.month), n: Number(row.n) }));
}

export type AnomalyNote = {
  dimension: string;
  dimensionKey: string;
  periodWeek: string;
  observed: number;
  z: number;
};

/** Recent non-dismissed anomalies — the report's "notable deviations" notes. */
export async function anomalyNotes(limit = 5): Promise<AnomalyNote[]> {
  const result = await db.execute(sql`
    select dimension, dimension_key, period_week, observed, z
    from anomalies
    where status <> 'dismissed'
    order by period_week desc, z desc
    limit ${limit}
  `);
  return result.rows.map((row) => ({
    dimension: String(row.dimension),
    dimensionKey: String(row.dimension_key),
    periodWeek: String(row.period_week),
    observed: Number(row.observed),
    z: Number(row.z),
  }));
}

// ── Homepage ────────────────────────────────────────────────────────────────

export type HomeStats = {
  activeEntities: number;
  countries: number;
  factsTracked: number;
  sourcesMonitored: number;
};

export async function homeStats(): Promise<HomeStats> {
  const result = await db.execute(sql`
    select
      (select count(*)::int from entities where status = 'active') as entities,
      (select count(distinct country)::int from entities
        where status = 'active' and country is not null) as countries,
      (select count(*)::int from timeline_facts where status = 'approved') as facts,
      (select count(*)::int from sources where active = true) as sources
  `);
  const row = result.rows[0] ?? {};
  return {
    activeEntities: Number(row.entities ?? 0),
    countries: Number(row.countries ?? 0),
    factsTracked: Number(row.facts ?? 0),
    sourcesMonitored: Number(row.sources ?? 0),
  };
}

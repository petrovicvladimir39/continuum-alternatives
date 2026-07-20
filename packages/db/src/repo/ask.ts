import { and, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../client";
import { documents, entities, sources, timelineFacts } from "../schema";
import { publicPathFor } from "./public";
import type { FeedItem } from "./feed";
import type { EntityKind } from "./entities";

/**
 * Ask-bar data layer (Phase 25B) — multi-value filtered feed + the live
 * counts behind the "Today in Alternatives" strip and market fronts.
 * Deterministic SQL only; the parser lives in @continuum/shared.
 */

export type AskFeed = { items: FeedItem[]; total: number };

export async function listAskFeed(opts: {
  channels?: string[];
  countries?: string[];
  factTypes?: string[];
  /** Taxonomy strategy slugs — facts whose entity holds an APPROVED classification (Phase 26C). */
  strategies?: string[];
  /** Taxonomy asset-class slugs — class-level filter via approved classifications. */
  assetClasses?: string[];
  entityQuery?: string;
  /** Only items recorded in the last N hours (saved-view alert evaluation). */
  recordedWithinHours?: number;
  limit?: number;
}): Promise<AskFeed> {
  const conditions = [eq(timelineFacts.status, "approved")];
  if (opts.recordedWithinHours !== undefined && opts.recordedWithinHours > 0) {
    conditions.push(
      sql`${timelineFacts.recordedAt} >= now() - make_interval(hours => ${opts.recordedWithinHours})`,
    );
  }
  if (opts.strategies !== undefined && opts.strategies.length > 0) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM entity_classifications c
            WHERE c.entity_id = ${entities.id} AND c.status = 'approved'
              AND c.strategy IN (${sql.join(opts.strategies.map((s) => sql`${s}`), sql`, `)}))`,
    );
  }
  if (opts.assetClasses !== undefined && opts.assetClasses.length > 0) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM entity_classifications c
            WHERE c.entity_id = ${entities.id} AND c.status = 'approved'
              AND c.asset_class IN (${sql.join(opts.assetClasses.map((s) => sql`${s}`), sql`, `)}))`,
    );
  }
  if (opts.channels !== undefined && opts.channels.length > 0) {
    conditions.push(
      sql`${timelineFacts.audienceChannels} && ARRAY[${sql.join(
        opts.channels.map((c) => sql`${c}`),
        sql`, `,
      )}]::text[]`,
    );
  }
  if (opts.countries !== undefined && opts.countries.length > 0) {
    conditions.push(inArray(entities.country, opts.countries));
  }
  if (opts.factTypes !== undefined && opts.factTypes.length > 0) {
    conditions.push(inArray(timelineFacts.factType, opts.factTypes));
  }
  if (opts.entityQuery !== undefined && opts.entityQuery.trim() !== "") {
    conditions.push(ilike(entities.name, `%${opts.entityQuery.trim()}%`));
  }
  const where = and(...conditions);

  const totalRows = await db
    .select({ n: count() })
    .from(timelineFacts)
    .innerJoin(entities, eq(entities.id, timelineFacts.entityId))
    .where(where);

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
    .where(where)
    // Feed pages stay small; the 5000 ceiling exists for the member CSV
    // export path (Phase 29B), which states its cap honestly.
    .orderBy(desc(timelineFacts.occurredOn), desc(timelineFacts.recordedAt))
    .limit(Math.min(opts.limit ?? 30, 5000));

  return {
    items: rows.map((row) => ({
      id: row.id,
      occurredOn: row.occurredOn,
      title: row.title,
      factType: row.factType,
      channels: row.channels,
      entityName: row.entityName,
      entitySlug: row.entitySlug,
      entityKind: row.entityKind as EntityKind,
      entityCountry: row.entityCountry,
      entityHref:
        row.entityStatus === "active"
          ? publicPathFor(row.entityKind as EntityKind, row.entitySlug)
          : null,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
    })),
    total: totalRows[0]?.n ?? 0,
  };
}

/** Live counts for the deterministic Today strip (Phase 25D). */
export async function todayStripCounts(): Promise<{
  newSignals: number;
  countries: number;
  auctionsClosingThisWeek: number;
  fundUpdates: number;
}> {
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM timeline_facts
        WHERE status = 'approved' AND recorded_at >= date_trunc('day', now())) AS new_signals,
      (SELECT count(DISTINCT e.country)::int FROM timeline_facts f
        JOIN entities e ON e.id = f.entity_id
        WHERE f.status = 'approved' AND f.recorded_at >= date_trunc('day', now())
          AND e.country IS NOT NULL) AS countries,
      (SELECT count(*)::int FROM timeline_facts
        WHERE status = 'approved' AND fact_type = 'asset_sale_announced'
          AND (data->>'saleDate')::date BETWEEN current_date AND current_date + 7) AS auctions_week,
      (SELECT count(*)::int FROM timeline_facts
        WHERE status = 'approved' AND fact_type = 'fund_close'
          AND recorded_at >= now() - interval '7 days') AS fund_updates
  `);
  const row = result.rows[0] ?? {};
  return {
    newSignals: Number(row.new_signals ?? 0),
    countries: Number(row.countries ?? 0),
    auctionsClosingThisWeek: Number(row.auctions_week ?? 0),
    fundUpdates: Number(row.fund_updates ?? 0),
  };
}

export type VerticalEntityRow = {
  slug: string;
  name: string;
  country: string | null;
  logoUrl: string | null;
  activity: number;
  href: string | null;
};

/** Top entities of a vertical by activity (facts + edges), logo rows (Phase 25C). */
export async function topEntitiesForVertical(tags: string[], limit = 8): Promise<VerticalEntityRow[]> {
  if (tags.length === 0) {
    return [];
  }
  const result = await db.execute(sql`
    SELECT e.slug, e.name, e.country, e.kind, o.logo_url,
      ((SELECT count(*) FROM timeline_facts f WHERE f.entity_id = e.id AND f.status = 'approved')
       + (SELECT count(*) FROM edges x
            WHERE (x.source_entity_id = e.id OR x.target_entity_id = e.id)
              AND x.status = 'approved'))::int AS activity
    FROM entities e
    LEFT JOIN organizations o ON o.entity_id = e.id
    WHERE e.status = 'active'
      AND EXISTS (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id
                    AND t.tag IN (${sql.join(tags.map((t) => sql`${t}`), sql`, `)}))
    ORDER BY activity DESC, e.name ASC
    LIMIT ${limit}
  `);
  return result.rows.map((row) => ({
    slug: String(row.slug),
    name: String(row.name),
    country: row.country === null ? null : String(row.country),
    logoUrl: row.logo_url === null ? null : String(row.logo_url),
    activity: Number(row.activity),
    href: publicPathFor(String(row.kind) as EntityKind, String(row.slug)),
  }));
}

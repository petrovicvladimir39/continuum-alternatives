import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import { alertOutbox, memberAlertPrefs, memberWatchlist } from "../schema";
import { publicPathFor } from "./public";
import type { EntityKind } from "./entities";

/**
 * Watchlist + alert-outbox data layer (Phase 28). Member-scoped by design:
 * every function takes the member id the caller resolved from their own
 * session. Watcher identities are NEVER exposed — only the aggregate count,
 * and only at/above the privacy threshold.
 */

export const WATCHER_PRIVACY_THRESHOLD = 3;

export async function watchEntity(memberId: string, entityId: string): Promise<void> {
  await db.insert(memberWatchlist).values({ memberId, entityId }).onConflictDoNothing();
}

export async function unwatchEntity(memberId: string, entityId: string): Promise<void> {
  await db
    .delete(memberWatchlist)
    .where(and(eq(memberWatchlist.memberId, memberId), eq(memberWatchlist.entityId, entityId)));
}

export async function isWatching(memberId: string, entityId: string): Promise<boolean> {
  const rows = await db
    .select({ memberId: memberWatchlist.memberId })
    .from(memberWatchlist)
    .where(and(eq(memberWatchlist.memberId, memberId), eq(memberWatchlist.entityId, entityId)));
  return rows.length > 0;
}

/** Aggregate ONLY, and null below the threshold — never who. */
export async function watcherCount(entityId: string): Promise<number | null> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(memberWatchlist)
    .where(eq(memberWatchlist.entityId, entityId));
  const count = rows[0]?.n ?? 0;
  return count >= WATCHER_PRIVACY_THRESHOLD ? count : null;
}

export type WatchlistRow = {
  entityId: string;
  slug: string;
  name: string;
  country: string | null;
  logoUrl: string | null;
  latestActivity: string | null;
  href: string | null;
};

export async function listWatchlist(memberId: string): Promise<WatchlistRow[]> {
  const result = await db.execute(sql`
    SELECT e.id, e.slug, e.name, e.country, e.kind, o.logo_url,
      (SELECT max(f.occurred_on)::text FROM timeline_facts f
        WHERE f.entity_id = e.id AND f.status = 'approved') AS latest
    FROM member_watchlist w
    JOIN entities e ON e.id = w.entity_id
    LEFT JOIN organizations o ON o.entity_id = e.id
    WHERE w.member_id = ${memberId}
    ORDER BY w.created_at DESC
  `);
  return result.rows.map((row) => ({
    entityId: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    country: row.country === null ? null : String(row.country),
    logoUrl: row.logo_url === null ? null : String(row.logo_url),
    latestActivity: row.latest === null ? null : String(row.latest),
    href: publicPathFor(String(row.kind) as EntityKind, String(row.slug)),
  }));
}

export type AlertFrequency = "daily" | "instant_important" | "off";

export async function getAlertPrefs(
  memberId: string,
): Promise<{ frequency: AlertFrequency; watchdogOptIn: boolean }> {
  const rows = await db
    .select()
    .from(memberAlertPrefs)
    .where(eq(memberAlertPrefs.memberId, memberId));
  return {
    frequency: (rows[0]?.frequency ?? "daily") as AlertFrequency,
    watchdogOptIn: rows[0]?.watchdogOptIn ?? false,
  };
}

export async function setAlertFrequency(memberId: string, frequency: AlertFrequency): Promise<void> {
  await db
    .insert(memberAlertPrefs)
    .values({ memberId, frequency })
    .onConflictDoUpdate({ target: memberAlertPrefs.memberId, set: { frequency } });
}

/**
 * Event capture (Phase 28B): enqueue one outbox row per watching member.
 * Idempotent via the (member, kind, ref) unique index — re-approvals and
 * double-fired hooks insert nothing new.
 */
export async function enqueueAlertsForEntities(
  kind: "fact" | "article" | "edge" | "post",
  refId: string,
  entityIds: string[],
): Promise<number> {
  const distinct = [...new Set(entityIds)].filter((id) => id !== "");
  if (distinct.length === 0) {
    return 0;
  }
  const result = await db.execute(sql`
    INSERT INTO alert_outbox (member_id, kind, ref_id, entity_id)
    SELECT DISTINCT ON (w.member_id) w.member_id, ${kind}, ${refId}::uuid, w.entity_id
    FROM member_watchlist w
    WHERE w.entity_id IN (${sql.join(distinct.map((id) => sql`${id}::uuid`), sql`, `)})
    ON CONFLICT (member_id, kind, ref_id) DO NOTHING
  `);
  return Number(result.rowCount ?? 0);
}

/** view_hit rows for one saved view evaluation (pre-capped by the caller). */
export async function enqueueViewHits(memberId: string, refIds: string[]): Promise<number> {
  let inserted = 0;
  for (const refId of refIds) {
    const result = await db.execute(sql`
      INSERT INTO alert_outbox (member_id, kind, ref_id)
      VALUES (${memberId}, 'view_hit', ${refId}::uuid)
      ON CONFLICT (member_id, kind, ref_id) DO NOTHING
    `);
    inserted += Number(result.rowCount ?? 0);
  }
  return inserted;
}

export type OutboxItem = {
  id: string;
  kind: string;
  refId: string;
  entityId: string | null;
  createdAt: Date | null;
  sentAt: Date | null;
  seenAt: Date | null;
  title: string | null;
  href: string | null;
  entityName: string | null;
  factType: string | null;
  assetClass: string | null;
  strategy: string | null;
};

/** Outbox rows resolved to display shape (facts, articles, edges, view hits). */
export async function listOutbox(
  memberId: string,
  opts: { unsentOnly?: boolean; limit?: number } = {},
): Promise<OutboxItem[]> {
  const result = await db.execute(sql`
    SELECT ob.id, ob.kind, ob.ref_id, ob.entity_id, ob.created_at, ob.sent_at, ob.seen_at,
      f.title AS fact_title, f.fact_type,
      a.headline AS article_headline, a.slug AS article_slug,
      a.asset_class AS article_class, a.strategy AS article_strategy,
      left(p.body, 90) AS post_snippet,
      e.name AS entity_name, e.slug AS entity_slug, e.kind AS entity_kind,
      (SELECT c.asset_class FROM entity_classifications c
        WHERE c.entity_id = ob.entity_id AND c.status = 'approved'
        ORDER BY c.strategy DESC LIMIT 1) AS entity_class
    FROM alert_outbox ob
    LEFT JOIN timeline_facts f ON ob.kind IN ('fact', 'view_hit') AND f.id = ob.ref_id
    LEFT JOIN articles a ON ob.kind = 'article' AND a.id = ob.ref_id
    LEFT JOIN thread_posts p ON ob.kind = 'post' AND p.id = ob.ref_id AND p.status = 'published'
    LEFT JOIN entities e ON e.id = ob.entity_id
    WHERE ob.member_id = ${memberId}
      AND (${opts.unsentOnly === true} = false OR ob.sent_at IS NULL)
    ORDER BY ob.created_at DESC
    LIMIT ${Math.min(opts.limit ?? 100, 300)}
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    kind: String(row.kind),
    refId: String(row.ref_id),
    entityId: row.entity_id === null ? null : String(row.entity_id),
    createdAt: row.created_at === null ? null : new Date(String(row.created_at)),
    sentAt: row.sent_at === null ? null : new Date(String(row.sent_at)),
    seenAt: row.seen_at === null ? null : new Date(String(row.seen_at)),
    title:
      row.fact_title !== null
        ? String(row.fact_title)
        : row.article_headline !== null
          ? String(row.article_headline)
          : row.post_snippet !== null
            ? `Discussion: “${String(row.post_snippet)}${String(row.post_snippet).length >= 90 ? "…" : ""}”`
            : null,
    href:
      row.article_slug !== null
        ? `/news/${String(row.article_slug)}`
        : row.entity_slug !== null
          ? publicPathFor(String(row.entity_kind) as EntityKind, String(row.entity_slug))
          : null,
    entityName: row.entity_name === null ? null : String(row.entity_name),
    factType: row.fact_type === null ? null : String(row.fact_type),
    assetClass:
      row.article_class !== null
        ? String(row.article_class)
        : row.entity_class !== null
          ? String(row.entity_class)
          : null,
    strategy: row.article_strategy === null ? null : String(row.article_strategy),
  }));
}

export async function markOutboxSeen(memberId: string): Promise<void> {
  await db
    .update(alertOutbox)
    .set({ seenAt: new Date() })
    .where(and(eq(alertOutbox.memberId, memberId), isNull(alertOutbox.seenAt)));
}

export async function unseenOutboxCount(memberId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(alertOutbox)
    .where(and(eq(alertOutbox.memberId, memberId), isNull(alertOutbox.seenAt)));
  return rows[0]?.n ?? 0;
}

export async function markOutboxSent(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await db.execute(sql`
    UPDATE alert_outbox SET sent_at = now()
    WHERE id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
  `);
}

/** Members holding pending (unsent) rows — the daily delivery worklist. */
export async function membersWithPendingAlerts(): Promise<
  { memberId: string; email: string | null; frequency: string }[]
> {
  const result = await db.execute(sql`
    SELECT DISTINCT ob.member_id, m.email, coalesce(p.frequency, 'daily') AS frequency
    FROM alert_outbox ob
    JOIN member_profiles m ON m.id = ob.member_id AND m.deleted_at IS NULL
    LEFT JOIN member_alert_prefs p ON p.member_id = ob.member_id
    WHERE ob.sent_at IS NULL
  `);
  return result.rows.map((row) => ({
    memberId: String(row.member_id),
    email: row.email === null ? null : String(row.email),
    frequency: String(row.frequency),
  }));
}

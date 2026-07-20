import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { itemReactions, memberProfiles, postReports, threadPosts } from "../schema";
import { publicPathFor } from "./public";
import { enqueueAlertsForEntities } from "./watchlist";
import type { EntityKind } from "./entities";

/**
 * Community data layer (Phase 30). Member-gated, never founding-gated —
 * participation wants breadth (see schema/community.ts). All authorization
 * is app-layer: every write takes the member id the caller resolved from
 * their own Clerk session.
 */

export const REACTIONS = ["credible", "doubtful", "watching"] as const;
export type Reaction = (typeof REACTIONS)[number];
export type ReactionTargetKind = "fact" | "article";

/** Public UI shows counts only at/above this — no tiny-N theatre. */
export const REACTION_PUBLIC_THRESHOLD = 3;

/**
 * One reaction per member per item, switchable: same reaction again clears
 * it (un-react), a different one replaces it. Returns what happened.
 */
export async function toggleReaction(
  memberId: string,
  targetKind: ReactionTargetKind,
  targetId: string,
  reaction: Reaction,
): Promise<"set" | "cleared"> {
  const existing = await db
    .select({ reaction: itemReactions.reaction })
    .from(itemReactions)
    .where(
      and(
        eq(itemReactions.memberId, memberId),
        eq(itemReactions.targetKind, targetKind),
        eq(itemReactions.targetId, targetId),
      ),
    );
  if (existing[0]?.reaction === reaction) {
    await db
      .delete(itemReactions)
      .where(
        and(
          eq(itemReactions.memberId, memberId),
          eq(itemReactions.targetKind, targetKind),
          eq(itemReactions.targetId, targetId),
        ),
      );
    return "cleared";
  }
  await db
    .insert(itemReactions)
    .values({ memberId, targetKind, targetId, reaction })
    .onConflictDoUpdate({
      target: [itemReactions.memberId, itemReactions.targetKind, itemReactions.targetId],
      set: { reaction, createdAt: new Date() },
    });
  return "set";
}

export type ReactionCounts = Record<Reaction, number>;

const EMPTY_COUNTS: ReactionCounts = { credible: 0, doubtful: 0, watching: 0 };

/** Batched counts for a list surface — one query, no N+1. */
export async function reactionCountsFor(
  targetKind: ReactionTargetKind,
  targetIds: string[],
): Promise<Map<string, ReactionCounts>> {
  const map = new Map<string, ReactionCounts>();
  if (targetIds.length === 0) {
    return map;
  }
  const result = await db.execute(sql`
    SELECT target_id, reaction, count(*)::int AS n
    FROM item_reactions
    WHERE target_kind = ${targetKind}
      AND target_id IN (${sql.join(targetIds.map((id) => sql`${id}::uuid`), sql`, `)})
    GROUP BY target_id, reaction
  `);
  for (const row of result.rows) {
    const id = String(row.target_id);
    const counts = map.get(id) ?? { ...EMPTY_COUNTS };
    counts[String(row.reaction) as Reaction] = Number(row.n);
    map.set(id, counts);
  }
  return map;
}

/** The member's own reactions across a list — for the underlined state. */
export async function memberReactionsFor(
  memberId: string,
  targetKind: ReactionTargetKind,
  targetIds: string[],
): Promise<Map<string, Reaction>> {
  const map = new Map<string, Reaction>();
  if (targetIds.length === 0) {
    return map;
  }
  const result = await db.execute(sql`
    SELECT target_id, reaction FROM item_reactions
    WHERE member_id = ${memberId} AND target_kind = ${targetKind}
      AND target_id IN (${sql.join(targetIds.map((id) => sql`${id}::uuid`), sql`, `)})
  `);
  for (const row of result.rows) {
    map.set(String(row.target_id), String(row.reaction) as Reaction);
  }
  return map;
}

/**
 * STRUCTURED SENTIMENT (Phase 30A): reaction aggregates sliced per entity /
 * channel / asset class. This is an INPUT — for ranking later and the
 * prediction layer eventually — and an internal instrument. It is never
 * rendered publicly as scores or percentages; small-sample "72% credible"
 * badges would manufacture precision that isn't there.
 */
export async function reactionSentiment(filter: {
  entityId?: string;
  channel?: string;
  assetClass?: string;
}): Promise<{ reaction: Reaction; count: number }[]> {
  const result = await db.execute(sql`
    SELECT r.reaction, count(*)::int AS n
    FROM item_reactions r
    LEFT JOIN timeline_facts f ON r.target_kind = 'fact' AND f.id = r.target_id
    LEFT JOIN articles a ON r.target_kind = 'article' AND a.id = r.target_id
    WHERE (${filter.entityId ?? null}::uuid IS NULL
             OR f.entity_id = ${filter.entityId ?? null}::uuid
             OR a.primary_entity_id = ${filter.entityId ?? null}::uuid)
      AND (${filter.channel ?? null}::text IS NULL
             OR ${filter.channel ?? null} = ANY(coalesce(f.audience_channels, '{}'))
             OR ${filter.channel ?? null} = ANY(coalesce(a.channels, '{}')))
      AND (${filter.assetClass ?? null}::text IS NULL
             OR a.asset_class = ${filter.assetClass ?? null}
             OR EXISTS (SELECT 1 FROM entity_classifications c
                          WHERE c.entity_id = f.entity_id AND c.status = 'approved'
                            AND c.asset_class = ${filter.assetClass ?? null}))
    GROUP BY r.reaction
    ORDER BY r.reaction
  `);
  return result.rows.map((row) => ({
    reaction: String(row.reaction) as Reaction,
    count: Number(row.n),
  }));
}

// ── Threads ──────────────────────────────────────────────────────────────

export type AnchorKind = "entity" | "article" | "event";

export type ThreadPostView = {
  id: string;
  memberId: string;
  body: string;
  status: string;
  createdAt: Date | null;
  editedAt: Date | null;
  authorName: string;
  /** "Partner · Adria Capital" — only what the member chose to state. */
  authorLine: string | null;
};

/** Published posts in full; removed posts as continuity stubs (no body). */
export async function listThreadPosts(
  anchorKind: AnchorKind,
  anchorId: string,
): Promise<ThreadPostView[]> {
  const rows = await db
    .select({
      id: threadPosts.id,
      memberId: threadPosts.memberId,
      body: threadPosts.body,
      status: threadPosts.status,
      createdAt: threadPosts.createdAt,
      editedAt: threadPosts.editedAt,
      displayName: memberProfiles.displayName,
      roleTitle: memberProfiles.roleTitle,
      organization: memberProfiles.organization,
    })
    .from(threadPosts)
    .innerJoin(memberProfiles, eq(memberProfiles.id, threadPosts.memberId))
    .where(and(eq(threadPosts.anchorKind, anchorKind), eq(threadPosts.anchorId, anchorId)))
    .orderBy(threadPosts.createdAt);
  return rows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    body: row.status === "removed" ? "" : row.body,
    status: row.status,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    authorName: row.displayName ?? "Member",
    authorLine:
      [row.roleTitle, row.organization].filter((part) => part !== null && part !== "").join(" · ") ||
      null,
  }));
}

export async function createThreadPost(input: {
  memberId: string;
  anchorKind: AnchorKind;
  anchorId: string;
  body: string;
}): Promise<{ id: string }> {
  const rows = await db
    .insert(threadPosts)
    .values({
      memberId: input.memberId,
      anchorKind: input.anchorKind,
      anchorId: input.anchorId,
      body: input.body,
    })
    .returning({ id: threadPosts.id });
  return rows[0]!;
}

/**
 * Watch-post notification (Phase 30C): a new ENTITY-anchored post enters
 * the alert outbox (kind 'post') through the existing idempotent pipeline —
 * daily batch only, never instant. The poster's own row is removed: nobody
 * needs an email about their own words.
 */
export async function enqueuePostAlerts(
  postId: string,
  entityId: string,
  posterMemberId: string,
): Promise<number> {
  const inserted = await enqueueAlertsForEntities("post", postId, [entityId]);
  const removed = await db.execute(sql`
    DELETE FROM alert_outbox
    WHERE member_id = ${posterMemberId} AND kind = 'post' AND ref_id = ${postId}::uuid
  `);
  return inserted - Number(removed.rowCount ?? 0);
}

/** Posts since UTC midnight — the 5/day rate limit reads this. */
export async function countPostsToday(memberId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n FROM thread_posts
    WHERE member_id = ${memberId} AND created_at >= date_trunc('day', now())
  `);
  return Number(result.rows[0]?.n ?? 0);
}

/** Has this member ever posted? Gates the one-time first-post notice. */
export async function memberHasPosted(memberId: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT 1 FROM thread_posts WHERE member_id = ${memberId} LIMIT 1`,
  );
  return result.rows.length > 0;
}

// ── Moderation ───────────────────────────────────────────────────────────

/** One-click report; duplicate reports from the same member collapse. */
export async function reportPost(
  postId: string,
  memberId: string,
  reason: string | null,
): Promise<void> {
  await db
    .insert(postReports)
    .values({ postId, memberId, reason })
    .onConflictDoNothing();
}

export async function setPostStatus(
  postId: string,
  status: "published" | "removed",
): Promise<boolean> {
  const rows = await db
    .update(threadPosts)
    .set({ status })
    .where(eq(threadPosts.id, postId))
    .returning({ id: threadPosts.id });
  return rows.length > 0;
}

/** NULL clears the ban. Enforcement lives in the community actions. */
export async function setMemberBan(memberId: string, until: Date | null): Promise<void> {
  await db.update(memberProfiles).set({ bannedUntil: until }).where(eq(memberProfiles.id, memberId));
}

export type ModerationPost = {
  id: string;
  anchorKind: string;
  anchorId: string;
  anchorLabel: string;
  anchorHref: string | null;
  body: string;
  status: string;
  createdAt: Date | null;
  reportCount: number;
  reportReasons: string[];
  memberId: string;
  authorName: string;
  authorEmail: string | null;
  authorPostCount: number;
  bannedUntil: Date | null;
};

/**
 * Admin worklist: reported posts first (most-reported at top), then recent.
 * The ADMIN sees poster identity and history — the public never does beyond
 * the real-name line.
 */
export async function listModerationPosts(limit = 100): Promise<ModerationPost[]> {
  const result = await db.execute(sql`
    SELECT p.id, p.anchor_kind, p.anchor_id, p.body, p.status, p.created_at,
      m.id AS member_id, coalesce(m.display_name, 'Member') AS author_name,
      m.email AS author_email, m.banned_until,
      (SELECT count(*)::int FROM thread_posts x WHERE x.member_id = m.id) AS author_posts,
      (SELECT count(*)::int FROM post_reports r WHERE r.post_id = p.id) AS reports,
      coalesce((SELECT array_agg(r.reason) FILTER (WHERE r.reason IS NOT NULL AND r.reason <> '')
                  FROM post_reports r WHERE r.post_id = p.id), '{}') AS reasons,
      e.name AS entity_name, e.slug AS entity_slug, e.kind AS entity_kind,
      a.headline AS article_headline, a.slug AS article_slug
    FROM thread_posts p
    JOIN member_profiles m ON m.id = p.member_id
    LEFT JOIN entities e ON p.anchor_kind = 'entity' AND e.id = p.anchor_id
    LEFT JOIN articles a ON p.anchor_kind = 'article' AND a.id = p.anchor_id
    ORDER BY (SELECT count(*) FROM post_reports r WHERE r.post_id = p.id) DESC,
             p.created_at DESC
    LIMIT ${limit}
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    anchorKind: String(row.anchor_kind),
    anchorId: String(row.anchor_id),
    anchorLabel:
      row.entity_name !== null
        ? String(row.entity_name)
        : row.article_headline !== null
          ? String(row.article_headline)
          : String(row.anchor_id).slice(0, 8),
    anchorHref:
      row.entity_slug !== null
        ? publicPathFor(String(row.entity_kind) as EntityKind, String(row.entity_slug))
        : row.article_slug !== null
          ? `/news/${String(row.article_slug)}`
          : null,
    body: String(row.body),
    status: String(row.status),
    createdAt: row.created_at === null ? null : new Date(String(row.created_at)),
    reportCount: Number(row.reports),
    reportReasons: (row.reasons as string[] | null) ?? [],
    memberId: String(row.member_id),
    authorName: String(row.author_name),
    authorEmail: row.author_email === null ? null : String(row.author_email),
    authorPostCount: Number(row.author_posts),
    bannedUntil: row.banned_until === null ? null : new Date(String(row.banned_until)),
  }));
}

// ── Discussed module (Phase 30C) ────────────────────────────────────────

export type DiscussedEntity = {
  entityId: string;
  name: string;
  href: string | null;
  postCount: number;
};

/**
 * The news-front "Discussed" band: entities with the most PUBLISHED posts
 * in the window, minimum enforced honestly — under the minimum the module
 * simply does not render. No engagement bait.
 */
export async function discussedEntities(
  days = 7,
  minPosts = 2,
  limit = 3,
): Promise<DiscussedEntity[]> {
  const result = await db.execute(sql`
    SELECT e.id, e.name, e.slug, e.kind, count(*)::int AS n
    FROM thread_posts p
    JOIN entities e ON e.id = p.anchor_id AND e.status = 'active'
    WHERE p.anchor_kind = 'entity' AND p.status = 'published'
      AND p.created_at >= now() - make_interval(days => ${days})
    GROUP BY e.id, e.name, e.slug, e.kind
    HAVING count(*) >= ${minPosts}
    ORDER BY count(*) DESC, max(p.created_at) DESC
    LIMIT ${limit}
  `);
  return result.rows.map((row) => ({
    entityId: String(row.id),
    name: String(row.name),
    href: publicPathFor(String(row.kind) as EntityKind, String(row.slug)),
    postCount: Number(row.n),
  }));
}

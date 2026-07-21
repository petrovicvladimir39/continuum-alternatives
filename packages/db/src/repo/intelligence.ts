import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import {
  askGroundings,
  docChats,
  documents,
  memberAlertPrefs,
  memberDailyUsage,
  scoutSubmissions,
  sources,
  timelineFacts,
  watchdogBriefs,
} from "../schema";

/**
 * Intelligence-toolkit data layer (Phase 34). Every cap and counter here
 * is deterministic SQL; the LLM layers above can only spend what these
 * functions allow.
 */

// ── Daily usage counters (shared by 34C/34D/34E) ─────────────────────────

export type UsageKind = "doc_chat" | "ask_ground" | "scout";

/** Check-then-increment: false = over the limit, nothing incremented. */
export async function tryConsumeDailyUsage(
  memberId: string,
  kind: UsageKind,
  limit: number,
): Promise<boolean> {
  const rows = await db
    .select({ count: memberDailyUsage.count })
    .from(memberDailyUsage)
    .where(
      and(
        eq(memberDailyUsage.memberId, memberId),
        eq(memberDailyUsage.kind, kind),
        eq(memberDailyUsage.day, sql`current_date`),
      ),
    );
  if ((rows[0]?.count ?? 0) >= limit) {
    return false;
  }
  await db.execute(sql`
    INSERT INTO member_daily_usage (member_id, kind, day, count)
    VALUES (${memberId}, ${kind}, current_date, 1)
    ON CONFLICT (member_id, kind, day) DO UPDATE SET count = member_daily_usage.count + 1
  `);
  return true;
}

export async function dailyUsage(memberId: string, kind: UsageKind): Promise<number> {
  const result = await db.execute(sql`
    SELECT count FROM member_daily_usage
    WHERE member_id = ${memberId} AND kind = ${kind} AND day = current_date
  `);
  return Number(result.rows[0]?.count ?? 0);
}

// ── Chat-with-filing (34C) ───────────────────────────────────────────────

export function normalizeQuestion(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 300);
}

export type DocChatAnswer = {
  answer: string;
  quotes: { verbatim: string; note: string }[];
};

export async function getCachedDocChat(
  documentId: string,
  questionNormalized: string,
): Promise<DocChatAnswer | null> {
  const rows = await db
    .select({ answer: docChats.answer })
    .from(docChats)
    .where(
      and(eq(docChats.documentId, documentId), eq(docChats.questionNormalized, questionNormalized)),
    );
  return rows.length === 0 ? null : (rows[0]!.answer as DocChatAnswer);
}

export async function storeDocChat(input: {
  documentId: string;
  memberId: string | null;
  questionNormalized: string;
  answer: DocChatAnswer;
  costUsd: number;
}): Promise<void> {
  await db
    .insert(docChats)
    .values({
      documentId: input.documentId,
      memberId: input.memberId,
      questionNormalized: input.questionNormalized,
      answer: input.answer,
      costUsd: String(input.costUsd),
    })
    .onConflictDoNothing();
}

/** Today's total filing-chat spend — the $1/day global guard reads this. */
export async function docChatCostToday(): Promise<number> {
  const result = await db.execute(sql`
    SELECT coalesce(sum(cost_usd), 0)::float8 AS total FROM doc_chats
    WHERE created_at >= date_trunc('day', now())
  `);
  return Number(result.rows[0]?.total ?? 0);
}

/** All cached Q&A for one document, newest first (cached views are free). */
export async function listDocChats(documentId: string): Promise<
  { question: string; answer: DocChatAnswer; createdAt: Date | null }[]
> {
  const rows = await db
    .select({
      question: docChats.questionNormalized,
      answer: docChats.answer,
      createdAt: docChats.createdAt,
    })
    .from(docChats)
    .where(eq(docChats.documentId, documentId))
    .orderBy(desc(docChats.createdAt))
    .limit(30);
  return rows.map((row) => ({
    question: row.question,
    answer: row.answer as DocChatAnswer,
    createdAt: row.createdAt,
  }));
}

export type PublicDocument = {
  id: string;
  title: string | null;
  url: string | null;
  sourceName: string | null;
  language: string | null;
  fetchedAt: Date | null;
  contentText: string;
};

export async function getDocumentForChat(documentId: string): Promise<PublicDocument | null> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      url: documents.url,
      language: documents.language,
      fetchedAt: documents.fetchedAt,
      contentText: documents.contentText,
      sourceName: sources.name,
    })
    .from(documents)
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(eq(documents.id, documentId));
  const row = rows[0];
  if (row === undefined || row.contentText === null || row.contentText.trim() === "") {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    sourceName: row.sourceName,
    language: row.language,
    fetchedAt: row.fetchedAt,
    contentText: row.contentText,
  };
}

// ── Ask grounding cache (34D) ────────────────────────────────────────────

export async function getCachedGrounding(questionNormalized: string): Promise<unknown | null> {
  const rows = await db
    .select({ filters: askGroundings.filters })
    .from(askGroundings)
    .where(eq(askGroundings.questionNormalized, questionNormalized));
  if (rows.length === 0) {
    return null;
  }
  await db.execute(sql`
    UPDATE ask_groundings SET hit_count = hit_count + 1
    WHERE question_normalized = ${questionNormalized}
  `);
  return rows[0]!.filters;
}

export async function storeGrounding(
  questionNormalized: string,
  filters: unknown,
  costUsd: number,
): Promise<void> {
  await db
    .insert(askGroundings)
    .values({ questionNormalized, filters, costUsd: String(costUsd) })
    .onConflictDoNothing();
}

export async function groundingCostToday(): Promise<number> {
  const result = await db.execute(sql`
    SELECT coalesce(sum(cost_usd), 0)::float8 AS total FROM ask_groundings
    WHERE created_at >= date_trunc('day', now())
  `);
  return Number(result.rows[0]?.total ?? 0);
}

// ── Scout submissions (34E) ──────────────────────────────────────────────

export async function createScoutSubmission(input: {
  memberId: string;
  factType: string;
  entityIds: string[];
  entitiesFree: string | null;
  occurredOn: string;
  sourceUrl: string;
  note: string | null;
  anonymous: boolean;
}): Promise<{ id: string }> {
  const rows = await db
    .insert(scoutSubmissions)
    .values(input)
    .returning({ id: scoutSubmissions.id });
  return rows[0]!;
}

export type PendingScout = {
  id: string;
  factType: string;
  entityIds: string[];
  entityNames: string[];
  entitiesFree: string | null;
  occurredOn: string;
  sourceUrl: string;
  note: string | null;
  anonymous: boolean;
  memberName: string;
  createdAt: Date | null;
};

export async function listPendingScouts(): Promise<PendingScout[]> {
  const result = await db.execute(sql`
    SELECT s.*, coalesce(m.display_name, 'Member') AS member_name,
      coalesce((SELECT array_agg(e.name) FROM entities e WHERE e.id = ANY(s.entity_ids)), '{}') AS entity_names
    FROM scout_submissions s
    JOIN member_profiles m ON m.id = s.member_id
    WHERE s.status = 'pending'
    ORDER BY s.created_at ASC
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    factType: String(row.fact_type),
    entityIds: (row.entity_ids as string[] | null) ?? [],
    entityNames: (row.entity_names as string[] | null) ?? [],
    entitiesFree: row.entities_free === null ? null : String(row.entities_free),
    occurredOn: String(row.occurred_on),
    sourceUrl: String(row.source_url),
    note: row.note === null ? null : String(row.note),
    anonymous: Boolean(row.anonymous),
    memberName: String(row.member_name),
    createdAt: row.created_at === null ? null : new Date(String(row.created_at)),
  }));
}

/**
 * Approval PUBLISHES: a document row for the required source URL (so the
 * citation renders through the normal spine) + one APPROVED fact per
 * involved entity. timeline_facts is append-only — this only ever inserts.
 * The credit line rides fact.data.contributed_by (absent when anonymous).
 */
export async function approveScoutSubmission(
  scoutId: string,
  title: string,
): Promise<{ factIds: string[] } | null> {
  const rows = await db
    .select()
    .from(scoutSubmissions)
    .where(and(eq(scoutSubmissions.id, scoutId), eq(scoutSubmissions.status, "pending")));
  const scout = rows[0];
  if (scout === undefined || scout.entityIds.length === 0 || title.trim() === "") {
    return null;
  }
  const memberName = await db.execute(
    sql`SELECT display_name FROM member_profiles WHERE id = ${scout.memberId}`,
  );
  const contributedBy = scout.anonymous
    ? null
    : String(memberName.rows[0]?.display_name ?? "Member");

  const docRows = await db
    .insert(documents)
    .values({
      url: scout.sourceUrl,
      title: `Member-contributed source`,
      docType: "scout_submission",
      fetchedAt: new Date(),
    })
    .returning({ id: documents.id });
  const documentId = docRows[0]!.id;

  const factIds: string[] = [];
  for (const entityId of scout.entityIds) {
    const factRows = await db
      .insert(timelineFacts)
      .values({
        entityId,
        factType: scout.factType,
        occurredOn: scout.occurredOn,
        title: title.trim().slice(0, 200),
        body: scout.note,
        status: "approved",
        confidence: "0.6",
        sourceDocumentId: documentId,
        data: contributedBy === null ? { scout: true } : { scout: true, contributed_by: contributedBy },
      })
      .returning({ id: timelineFacts.id });
    factIds.push(factRows[0]!.id);
  }
  await db
    .update(scoutSubmissions)
    .set({ status: "approved", decidedAt: new Date(), publishedFactId: factIds[0] })
    .where(eq(scoutSubmissions.id, scoutId));
  return { factIds };
}

export async function rejectScoutSubmission(scoutId: string): Promise<boolean> {
  const rows = await db
    .update(scoutSubmissions)
    .set({ status: "rejected", decidedAt: new Date() })
    .where(and(eq(scoutSubmissions.id, scoutId), eq(scoutSubmissions.status, "pending")))
    .returning({ id: scoutSubmissions.id });
  return rows.length > 0;
}

/** Contributor stats for /account — approved count is the "credit". */
export async function memberScoutStats(
  memberId: string,
): Promise<{ submitted: number; approved: number }> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS submitted,
      count(*) FILTER (WHERE status = 'approved')::int AS approved
    FROM scout_submissions WHERE member_id = ${memberId}
  `);
  const row = result.rows[0] ?? {};
  return { submitted: Number(row.submitted ?? 0), approved: Number(row.approved ?? 0) };
}

// ── Watchdog (34E) ───────────────────────────────────────────────────────

export async function setWatchdogOptIn(memberId: string, optIn: boolean): Promise<void> {
  await db
    .insert(memberAlertPrefs)
    .values({ memberId, watchdogOptIn: optIn })
    .onConflictDoUpdate({ target: memberAlertPrefs.memberId, set: { watchdogOptIn: optIn } });
}

export async function watchdogOptedMembers(): Promise<
  { memberId: string; email: string | null; displayName: string | null }[]
> {
  const result = await db.execute(sql`
    SELECT m.id, m.email, m.display_name
    FROM member_alert_prefs p
    JOIN member_profiles m ON m.id = p.member_id AND m.deleted_at IS NULL
    WHERE p.watchdog_opt_in = true
  `);
  return result.rows.map((row) => ({
    memberId: String(row.id),
    email: row.email === null ? null : String(row.email),
    displayName: row.display_name === null ? null : String(row.display_name),
  }));
}

export type WatchdogItem = {
  kind: "fact" | "article" | "post";
  title: string;
  excerpt: string | null;
  sourceName: string | null;
  entityName: string | null;
  occurredOn: string | null;
};

/**
 * The member's week: facts/articles/posts from the last 7 days touching
 * their watchlist or universe (affiliation + matched contact orgs).
 * Titles + excerpts + source names ONLY — exactly what the compose guards
 * then hold the model to.
 */
export async function watchdogWeekItems(memberId: string): Promise<WatchdogItem[]> {
  const result = await db.execute(sql`
    WITH my_entities AS (
      SELECT entity_id FROM member_watchlist WHERE member_id = ${memberId}
      UNION
      SELECT organization_entity_id FROM member_profiles
        WHERE id = ${memberId} AND organization_entity_id IS NOT NULL
      UNION
      SELECT contact_org_entity_id FROM member_private_edges
        WHERE member_id = ${memberId} AND contact_org_entity_id IS NOT NULL
    )
    SELECT 'fact' AS kind, f.title, left(coalesce(f.data->>'excerpt_original', f.body, ''), 300) AS excerpt,
      s.name AS source_name, e.name AS entity_name, f.occurred_on::text AS occurred_on
    FROM timeline_facts f
    JOIN my_entities me ON me.entity_id = f.entity_id
    JOIN entities e ON e.id = f.entity_id
    LEFT JOIN documents d ON d.id = f.source_document_id
    LEFT JOIN sources s ON s.id = d.source_id
    WHERE f.status = 'approved' AND coalesce(f.recorded_at, f.occurred_on::timestamptz) >= now() - interval '7 days'
    UNION ALL
    SELECT 'article', a.headline, left(coalesce(a.deck, ''), 300), a.byline, e2.name, a.published_at::date::text
    FROM articles a
    LEFT JOIN entities e2 ON e2.id = a.primary_entity_id
    WHERE a.status = 'published' AND a.published_at >= now() - interval '7 days'
      AND a.primary_entity_id IN (SELECT entity_id FROM my_entities)
    UNION ALL
    SELECT 'post', left(p.body, 120), NULL, NULL, e3.name, p.created_at::date::text
    FROM thread_posts p
    JOIN entities e3 ON e3.id = p.anchor_id
    WHERE p.anchor_kind = 'entity' AND p.status = 'published'
      AND p.created_at >= now() - interval '7 days'
      AND p.anchor_id IN (SELECT entity_id FROM my_entities)
    ORDER BY occurred_on DESC NULLS LAST
    LIMIT 40
  `);
  return result.rows.map((row) => ({
    kind: String(row.kind) as WatchdogItem["kind"],
    title: String(row.title),
    excerpt: row.excerpt === null || row.excerpt === "" ? null : String(row.excerpt),
    sourceName: row.source_name === null ? null : String(row.source_name),
    entityName: row.entity_name === null ? null : String(row.entity_name),
    occurredOn: row.occurred_on === null ? null : String(row.occurred_on),
  }));
}

export async function getWatchdogBrief(
  memberId: string,
  weekStart: string,
): Promise<{ bodyMd: string } | null> {
  const rows = await db
    .select({ bodyMd: watchdogBriefs.bodyMd })
    .from(watchdogBriefs)
    .where(and(eq(watchdogBriefs.memberId, memberId), eq(watchdogBriefs.weekStart, weekStart)));
  return rows[0] ?? null;
}

export async function storeWatchdogBrief(input: {
  memberId: string;
  weekStart: string;
  bodyMd: string;
  costUsd: number;
}): Promise<void> {
  await db
    .insert(watchdogBriefs)
    .values({ ...input, costUsd: String(input.costUsd) })
    .onConflictDoNothing();
}

export async function markWatchdogSent(memberId: string, weekStart: string): Promise<void> {
  await db
    .update(watchdogBriefs)
    .set({ sentAt: new Date() })
    .where(and(eq(watchdogBriefs.memberId, memberId), eq(watchdogBriefs.weekStart, weekStart)));
}

/** This week's watchdog spend — the $2/week global guard reads this. */
export async function watchdogCostThisWeek(): Promise<number> {
  const result = await db.execute(sql`
    SELECT coalesce(sum(cost_usd), 0)::float8 AS total FROM watchdog_briefs
    WHERE created_at >= date_trunc('week', now())
  `);
  return Number(result.rows[0]?.total ?? 0);
}

// ── Ops dashboard (34F) ──────────────────────────────────────────────────

export type OpsSourceRow = {
  name: string;
  active: boolean;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  docsPerDay: number[];
};

export async function opsSourceFreshness(days = 14): Promise<OpsSourceRow[]> {
  const result = await db.execute(sql`
    SELECT s.name, s.active, s.last_run_at, s.last_run_status,
      (SELECT array_agg(n ORDER BY day) FROM (
        SELECT d.day::date AS day, count(doc.id)::int AS n
        FROM generate_series(current_date - ${days - 1}, current_date, '1 day') AS d(day)
        LEFT JOIN documents doc ON doc.source_id = s.id AND doc.fetched_at::date = d.day::date
        GROUP BY d.day
      ) spark) AS docs_per_day
    FROM sources s
    WHERE s.active = true OR s.last_run_at IS NOT NULL
    ORDER BY s.last_run_at DESC NULLS LAST
    LIMIT 60
  `);
  return result.rows.map((row) => ({
    name: String(row.name),
    active: Boolean(row.active),
    lastRunAt: row.last_run_at === null ? null : new Date(String(row.last_run_at)),
    lastRunStatus: row.last_run_status === null ? null : String(row.last_run_status),
    docsPerDay: (row.docs_per_day as number[] | null) ?? [],
  }));
}

export type OpsCounts = {
  outboxPending: number;
  webhookFailures: number;
  rowCounts: { table: string; rows: number }[];
  llmSpend: { surface: string; today: number; total: number }[];
};

export async function opsCounts(): Promise<OpsCounts> {
  const [outbox, hooks, tables, spend] = await Promise.all([
    db.execute(sql`SELECT count(*)::int AS n FROM alert_outbox WHERE sent_at IS NULL`),
    db.execute(sql`SELECT coalesce(sum(failure_count), 0)::int AS n FROM member_webhooks`),
    db.execute(sql`
      SELECT relname AS table, greatest(n_live_tup, 0)::int AS rows
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC LIMIT 30
    `),
    db.execute(sql`
      SELECT 'entity briefs' AS surface,
        coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::float8 AS today,
        coalesce(sum(cost_usd), 0)::float8 AS total FROM brief_generations
      UNION ALL
      SELECT 'filing chat',
        coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::float8,
        coalesce(sum(cost_usd), 0)::float8 FROM doc_chats
      UNION ALL
      SELECT 'ask grounding',
        coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::float8,
        coalesce(sum(cost_usd), 0)::float8 FROM ask_groundings
      UNION ALL
      SELECT 'watchdog briefs',
        coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::float8,
        coalesce(sum(cost_usd), 0)::float8 FROM watchdog_briefs
    `),
  ]);
  return {
    outboxPending: Number(outbox.rows[0]?.n ?? 0),
    webhookFailures: Number(hooks.rows[0]?.n ?? 0),
    rowCounts: tables.rows.map((row) => ({ table: String(row.table), rows: Number(row.rows) })),
    llmSpend: spend.rows.map((row) => ({
      surface: String(row.surface),
      today: Number(row.today),
      total: Number(row.total),
    })),
  };
}

/** Facts contributed via scout, rendered with their credit line. */
export function scoutCreditOf(data: unknown): string | null {
  if (data === null || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  return typeof record.contributed_by === "string" ? record.contributed_by : null;
}

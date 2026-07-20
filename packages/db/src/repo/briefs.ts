import { eq, sql } from "drizzle-orm";
import { db } from "../client";
import { briefGenerations, entityBriefs } from "../schema";

/**
 * Entity-brief cache + cost ledger (Phase 29D). The data-version
 * fingerprint is deterministic SQL over APPROVED facts/edges and enrichment
 * presence — when it moves, the cached brief is stale. All cap/budget math
 * is COUNT/SUM in code; the model never touches a number here.
 */

export type BriefContent = {
  summary: string;
  key_facts: string[];
  relationships: string[];
  watch_points: string[];
  /** Source names that fed the generation — the citation footer. */
  source_names: string[];
};

export type BriefRow = typeof entityBriefs.$inferSelect;

/**
 * Fingerprint of everything a brief is allowed to read: approved fact/edge
 * counts + their max timestamps + enrichment presence. Append-only
 * timeline_facts means (count, max recorded_at) detects every change.
 */
export async function computeBriefDataVersion(entityId: string): Promise<string> {
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM timeline_facts f
        WHERE f.entity_id = ${entityId} AND f.status = 'approved') AS facts_n,
      (SELECT coalesce(to_char(max(f.recorded_at) AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS'), '0')
        FROM timeline_facts f
        WHERE f.entity_id = ${entityId} AND f.status = 'approved') AS facts_max,
      (SELECT count(*)::int FROM edges x
        WHERE (x.source_entity_id = ${entityId} OR x.target_entity_id = ${entityId})
          AND x.status = 'approved') AS edges_n,
      (SELECT coalesce(to_char(max(x.created_at) AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS'), '0')
        FROM edges x
        WHERE (x.source_entity_id = ${entityId} OR x.target_entity_id = ${entityId})
          AND x.status = 'approved') AS edges_max,
      (SELECT CASE WHEN o.enrichment IS NULL THEN '0' ELSE md5(o.enrichment::text) END
        FROM organizations o WHERE o.entity_id = ${entityId}) AS enrich
  `);
  const row = result.rows[0] ?? {};
  return [
    `f${Number(row.facts_n ?? 0)}:${String(row.facts_max ?? "0")}`,
    `e${Number(row.edges_n ?? 0)}:${String(row.edges_max ?? "0")}`,
    `x:${String(row.enrich ?? "0")}`,
  ].join("|");
}

export async function getBrief(entityId: string): Promise<BriefRow | null> {
  const rows = await db.select().from(entityBriefs).where(eq(entityBriefs.entityId, entityId));
  return rows[0] ?? null;
}

export async function upsertBrief(input: {
  entityId: string;
  content: BriefContent;
  dataVersion: string;
  model: string;
  generatedByMemberId: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}): Promise<void> {
  await db
    .insert(entityBriefs)
    .values({
      entityId: input.entityId,
      content: input.content,
      dataVersion: input.dataVersion,
      model: input.model,
      generatedByMemberId: input.generatedByMemberId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      costUsd: String(input.costUsd),
      generatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: entityBriefs.entityId,
      set: {
        content: input.content,
        dataVersion: input.dataVersion,
        model: input.model,
        generatedByMemberId: input.generatedByMemberId,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costUsd: String(input.costUsd),
        generatedAt: new Date(),
      },
    });
}

/** Every model call logs here — stored OR dropped; dropped runs still cost. */
export async function logBriefGeneration(input: {
  memberId: string | null;
  entityId: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  outcome: "stored" | "dropped_guard" | "dropped_parse";
}): Promise<void> {
  await db.insert(briefGenerations).values({
    memberId: input.memberId,
    entityId: input.entityId,
    costUsd: String(input.costUsd),
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    outcome: input.outcome,
  });
}

/** Fresh generations this calendar month (UTC) — the 20/month member cap. */
export async function countBriefGenerationsThisMonth(memberId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n FROM brief_generations
    WHERE member_id = ${memberId}
      AND created_at >= date_trunc('month', now())
  `);
  return Number(result.rows[0]?.n ?? 0);
}

/** Global model spend since UTC midnight — the $2/day guard. */
export async function briefCostTodayUsd(): Promise<number> {
  const result = await db.execute(sql`
    SELECT coalesce(sum(cost_usd), 0)::float8 AS usd FROM brief_generations
    WHERE created_at >= date_trunc('day', now())
  `);
  return Number(result.rows[0]?.usd ?? 0);
}

/** Admin cost telemetry: today / this month / all-time, spend and counts. */
export async function briefTelemetry(): Promise<{
  today: { generations: number; usd: number };
  month: { generations: number; usd: number };
  total: { generations: number; usd: number };
  cachedBriefs: number;
}> {
  const result = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today_n,
      coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('day', now())), 0)::float8 AS today_usd,
      count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS month_n,
      coalesce(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::float8 AS month_usd,
      count(*)::int AS total_n,
      coalesce(sum(cost_usd), 0)::float8 AS total_usd,
      (SELECT count(*)::int FROM entity_briefs) AS cached
    FROM brief_generations
  `);
  const row = result.rows[0] ?? {};
  return {
    today: { generations: Number(row.today_n ?? 0), usd: Number(row.today_usd ?? 0) },
    month: { generations: Number(row.month_n ?? 0), usd: Number(row.month_usd ?? 0) },
    total: { generations: Number(row.total_n ?? 0), usd: Number(row.total_usd ?? 0) },
    cachedBriefs: Number(row.cached ?? 0),
  };
}

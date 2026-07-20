import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { entityClassifications } from "../schema";
import { publicPathFor } from "./public";
import type { EntityKind } from "./entities";

/**
 * Classification data layer (Phase 26). Approval semantics mirror the rest
 * of the platform: keyword proposals NEVER auto-approve; only tag_map,
 * register, and operator rows are born approved.
 */

export type ClassificationRow = typeof entityClassifications.$inferSelect;

export async function upsertClassification(input: {
  entityId: string;
  assetClass: string;
  strategy: string;
  source: "tag_map" | "keyword" | "operator" | "register";
  status: "approved" | "proposed";
  confidence?: string;
}): Promise<void> {
  await db
    .insert(entityClassifications)
    .values({
      entityId: input.entityId,
      assetClass: input.assetClass,
      strategy: input.strategy,
      source: input.source,
      status: input.status,
      confidence: input.confidence ?? "1.00",
    })
    .onConflictDoNothing();
}

export async function removeClassification(
  entityId: string,
  assetClass: string,
  strategy: string,
): Promise<void> {
  await db
    .delete(entityClassifications)
    .where(
      and(
        eq(entityClassifications.entityId, entityId),
        eq(entityClassifications.assetClass, assetClass),
        eq(entityClassifications.strategy, strategy),
      ),
    );
}

export async function listClassificationsForEntity(entityId: string): Promise<ClassificationRow[]> {
  return db
    .select()
    .from(entityClassifications)
    .where(eq(entityClassifications.entityId, entityId));
}

export type CoverageRow = {
  assetClass: string;
  strategy: string;
  entities: number;
  signals: number;
};

/** Approved entities + 90-day signals per (class, strategy) — the gate input. */
export async function strategyCoverage(): Promise<CoverageRow[]> {
  const result = await db.execute(sql`
    SELECT c.asset_class, c.strategy,
      count(DISTINCT c.entity_id)::int AS entities,
      (SELECT count(*)::int FROM timeline_facts f
        WHERE f.status = 'approved'
          AND f.occurred_on >= current_date - 90
          AND f.entity_id IN (
            SELECT c2.entity_id FROM entity_classifications c2
            WHERE c2.asset_class = c.asset_class AND c2.strategy = c.strategy
              AND c2.status = 'approved')) AS signals
    FROM entity_classifications c
    WHERE c.status = 'approved'
    GROUP BY c.asset_class, c.strategy
  `);
  return result.rows.map((row) => ({
    assetClass: String(row.asset_class),
    strategy: String(row.strategy),
    entities: Number(row.entities),
    signals: Number(row.signals),
  }));
}

export type ProposedClassificationRow = {
  entityId: string;
  entityName: string;
  entitySlug: string;
  assetClass: string;
  strategy: string;
  source: string;
};

export async function listProposedClassifications(): Promise<ProposedClassificationRow[]> {
  const result = await db.execute(sql`
    SELECT c.entity_id, e.name, e.slug, c.asset_class, c.strategy, c.source
    FROM entity_classifications c
    JOIN entities e ON e.id = c.entity_id
    WHERE c.status = 'proposed'
    ORDER BY c.asset_class, c.strategy, e.name
  `);
  return result.rows.map((row) => ({
    entityId: String(row.entity_id),
    entityName: String(row.name),
    entitySlug: String(row.slug),
    assetClass: String(row.asset_class),
    strategy: String(row.strategy),
    source: String(row.source),
  }));
}

export async function decideClassification(
  entityId: string,
  assetClass: string,
  strategy: string,
  decision: "approved" | "rejected",
): Promise<void> {
  if (decision === "approved") {
    await db
      .update(entityClassifications)
      .set({ status: "approved" })
      .where(
        and(
          eq(entityClassifications.entityId, entityId),
          eq(entityClassifications.assetClass, assetClass),
          eq(entityClassifications.strategy, strategy),
        ),
      );
  } else {
    await removeClassification(entityId, assetClass, strategy);
  }
}

/** Batch decision over one (class, strategy) group of proposals. */
export async function decideClassificationGroup(
  assetClass: string,
  strategy: string,
  decision: "approved" | "rejected",
): Promise<number> {
  if (decision === "approved") {
    const rows = await db
      .update(entityClassifications)
      .set({ status: "approved" })
      .where(
        and(
          eq(entityClassifications.assetClass, assetClass),
          eq(entityClassifications.strategy, strategy),
          eq(entityClassifications.status, "proposed"),
        ),
      )
      .returning({ entityId: entityClassifications.entityId });
    return rows.length;
  }
  const rows = await db
    .delete(entityClassifications)
    .where(
      and(
        eq(entityClassifications.assetClass, assetClass),
        eq(entityClassifications.strategy, strategy),
        eq(entityClassifications.status, "proposed"),
      ),
    )
    .returning({ entityId: entityClassifications.entityId });
  return rows.length;
}

export type ClassifiedEntityRow = {
  slug: string;
  name: string;
  country: string | null;
  logoUrl: string | null;
  activity: number;
  href: string | null;
};

/** Top approved-classified entities for a class (optionally narrowed to strategies). */
export async function topEntitiesForClassification(
  assetClass: string,
  strategies: string[] | null,
  limit = 8,
): Promise<ClassifiedEntityRow[]> {
  const strategyCondition =
    strategies === null || strategies.length === 0
      ? sql`TRUE`
      : sql`c.strategy IN (${sql.join(strategies.map((s) => sql`${s}`), sql`, `)})`;
  const result = await db.execute(sql`
    SELECT e.slug, e.name, e.country, e.kind, o.logo_url,
      ((SELECT count(*) FROM timeline_facts f WHERE f.entity_id = e.id AND f.status = 'approved')
       + (SELECT count(*) FROM edges x
            WHERE (x.source_entity_id = e.id OR x.target_entity_id = e.id)
              AND x.status = 'approved'))::int AS activity
    FROM entities e
    LEFT JOIN organizations o ON o.entity_id = e.id
    WHERE e.status = 'active'
      AND EXISTS (SELECT 1 FROM entity_classifications c
                    WHERE c.entity_id = e.id AND c.status = 'approved'
                      AND c.asset_class = ${assetClass}
                      AND ${strategyCondition})
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

import { eq, inArray, or } from "drizzle-orm";
import { db } from "../client";
import { edges, edgeType, entities, reviewStatus } from "../schema";
import { requireEntityBySlug } from "./entities";

export type EdgeTypeName = (typeof edgeType.enumValues)[number];
export type ReviewStatusName = (typeof reviewStatus.enumValues)[number];

export type EdgeView = {
  id: string;
  edgeType: EdgeTypeName;
  sourceSlug: string;
  sourceName: string;
  targetSlug: string;
  targetName: string;
  dealSlug: string | null;
  role: string | null;
  startedOn: string | null;
  amount: string | null;
  currency: string | null;
  confidence: string;
  status: ReviewStatusName;
};

export async function createEdge(input: {
  edgeType: EdgeTypeName;
  sourceSlug: string;
  targetSlug: string;
  dealSlug?: string;
  role?: string;
  startedOn?: string;
  amount?: string;
  currency?: string;
  confidence?: string;
  status?: ReviewStatusName;
}): Promise<string> {
  const source = await requireEntityBySlug(input.sourceSlug);
  const target = await requireEntityBySlug(input.targetSlug);
  const deal = input.dealSlug === undefined ? null : await requireEntityBySlug(input.dealSlug);

  const inserted = await db
    .insert(edges)
    .values({
      edgeType: input.edgeType,
      sourceEntityId: source.id,
      targetEntityId: target.id,
      dealEntityId: deal?.id ?? null,
      role: input.role ?? null,
      startedOn: input.startedOn ?? null,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      confidence: input.confidence ?? "1.00",
      status: input.status ?? "approved",
    })
    .returning({ id: edges.id });
  const row = inserted[0];
  if (!row) {
    throw new Error("Edge insert returned no row");
  }
  return row.id;
}

export async function listEdges(
  slug: string,
  direction: "out" | "in" | "both" = "both",
): Promise<EdgeView[]> {
  const entity = await requireEntityBySlug(slug);
  const condition =
    direction === "out"
      ? eq(edges.sourceEntityId, entity.id)
      : direction === "in"
        ? eq(edges.targetEntityId, entity.id)
        : or(eq(edges.sourceEntityId, entity.id), eq(edges.targetEntityId, entity.id));

  const rows = await db.select().from(edges).where(condition);
  if (rows.length === 0) {
    return [];
  }

  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.sourceEntityId);
    ids.add(row.targetEntityId);
    if (row.dealEntityId) {
      ids.add(row.dealEntityId);
    }
  }
  const named = await db
    .select({ id: entities.id, slug: entities.slug, name: entities.name })
    .from(entities)
    .where(inArray(entities.id, [...ids]));
  const bySlug = new Map(named.map((row) => [row.id, row]));

  return rows.map((row) => {
    const source = bySlug.get(row.sourceEntityId);
    const target = bySlug.get(row.targetEntityId);
    const deal = row.dealEntityId ? bySlug.get(row.dealEntityId) : undefined;
    return {
      id: row.id,
      edgeType: row.edgeType,
      sourceSlug: source?.slug ?? row.sourceEntityId,
      sourceName: source?.name ?? row.sourceEntityId,
      targetSlug: target?.slug ?? row.targetEntityId,
      targetName: target?.name ?? row.targetEntityId,
      dealSlug: deal?.slug ?? null,
      role: row.role,
      startedOn: row.startedOn,
      amount: row.amount,
      currency: row.currency,
      confidence: row.confidence,
      status: row.status,
    };
  });
}

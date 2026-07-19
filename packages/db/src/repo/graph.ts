import { inArray, sql } from "drizzle-orm";
import { db } from "../client";
import { entities } from "../schema";
import { requireEntityBySlug } from "./entities";

export type GraphPath = {
  hops: number;
  nodes: { id: string; slug: string; name: string }[];
  steps: { edgeType: string; direction: "->" | "<-" }[];
};

export async function findPath(
  sourceSlug: string,
  targetSlug: string,
  maxHops = 4,
): Promise<GraphPath | null> {
  const source = await requireEntityBySlug(sourceSlug);
  const target = await requireEntityBySlug(targetSlug);
  if (source.id === target.id) {
    return {
      hops: 0,
      nodes: [{ id: source.id, slug: source.slug, name: source.name }],
      steps: [],
    };
  }

  const result = await db.execute(sql`
    WITH RECURSIVE adjacency AS (
      SELECT source_entity_id AS from_id, target_entity_id AS to_id,
             edge_type::text AS edge_type, '->' AS direction
      FROM edges WHERE status = 'approved'
      UNION ALL
      SELECT target_entity_id, source_entity_id, edge_type::text, '<-'
      FROM edges WHERE status = 'approved'
    ),
    walk AS (
      SELECT a.to_id AS node,
             ARRAY[${source.id}::uuid, a.to_id] AS visited,
             ARRAY[a.edge_type] AS edge_types,
             ARRAY[a.direction] AS directions,
             1 AS hops
      FROM adjacency a
      WHERE a.from_id = ${source.id}
      UNION ALL
      SELECT a.to_id,
             w.visited || a.to_id,
             w.edge_types || a.edge_type,
             w.directions || a.direction,
             w.hops + 1
      FROM walk w
      JOIN adjacency a ON a.from_id = w.node
      WHERE w.hops < ${maxHops} AND NOT (a.to_id = ANY (w.visited))
    )
    SELECT visited, edge_types, directions, hops
    FROM walk WHERE node = ${target.id}
    ORDER BY hops LIMIT 1
  `);

  const hit = result.rows[0];
  if (!hit) {
    return null;
  }
  const visited = hit.visited as string[];
  const edgeTypes = hit.edge_types as string[];
  const directions = hit.directions as ("->" | "<-")[];

  const named = await db
    .select({ id: entities.id, slug: entities.slug, name: entities.name })
    .from(entities)
    .where(inArray(entities.id, visited));
  const byId = new Map(named.map((row) => [row.id, row]));

  return {
    hops: Number(hit.hops),
    nodes: visited.map((id) => {
      const row = byId.get(id);
      return { id, slug: row?.slug ?? id, name: row?.name ?? id };
    }),
    steps: edgeTypes.map((edgeType, i) => ({ edgeType, direction: directions[i] ?? "->" })),
  };
}

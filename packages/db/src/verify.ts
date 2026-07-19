import "./env";
import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { entities } from "./schema";

const TABLES = [
  "entities",
  "organizations",
  "people",
  "fund_vehicles",
  "deals",
  "assets",
  "events",
  "edges",
  "timeline_facts",
  "entity_tags",
  "aliases",
  "sources",
  "documents",
  "ingestion_runs",
  "signals",
  "contacts",
];

let failed = false;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failed = true;
    console.error(`FAIL  ${message}`);
  }
}

async function entityIdBySlug(slug: string): Promise<string | undefined> {
  const rows = await db.select({ id: entities.id }).from(entities).where(eq(entities.slug, slug));
  return rows[0]?.id;
}

async function main() {
  const extensionResult = await db.execute(
    sql`SELECT extname FROM pg_extension WHERE extname IN ('vector', 'postgis') ORDER BY extname`,
  );
  const extensions = extensionResult.rows.map((row) => String(row.extname));
  check(extensions.includes("postgis"), "extension postgis installed");
  check(extensions.includes("vector"), "extension vector installed");

  console.log("\ntable counts:");
  for (const table of TABLES) {
    const result = await db.execute(sql.raw(`SELECT count(*)::int AS n FROM "${table}"`));
    console.log(`  ${table.padEnd(16)} ${Number(result.rows[0]?.n)}`);
  }

  const bankId = await entityIdBySlug("example-bank-ad");
  const servicerId = await entityIdBySlug("servis-one");
  check(bankId !== undefined, "entity example-bank-ad exists");
  check(servicerId !== undefined, "entity servis-one exists");

  if (bankId !== undefined && servicerId !== undefined) {
    const pathResult = await db.execute(sql`
      WITH RECURSIVE walk AS (
        SELECT
          e.target_entity_id AS node,
          ARRAY[e.source_entity_id, e.target_entity_id] AS visited,
          (SELECT name FROM entities WHERE id = e.source_entity_id)
            || ' -[' || e.edge_type::text || ']-> '
            || (SELECT name FROM entities WHERE id = e.target_entity_id) AS path,
          1 AS hops
        FROM edges e
        WHERE e.source_entity_id = ${bankId}
        UNION ALL
        SELECT
          e.target_entity_id,
          w.visited || e.target_entity_id,
          w.path
            || ' -[' || e.edge_type::text || ']-> '
            || (SELECT name FROM entities WHERE id = e.target_entity_id),
          w.hops + 1
        FROM walk w
        JOIN edges e ON e.source_entity_id = w.node
        WHERE w.hops < 4 AND NOT (e.target_entity_id = ANY (w.visited))
      )
      SELECT path, hops FROM walk WHERE node = ${servicerId} ORDER BY hops LIMIT 1
    `);
    const hit = pathResult.rows[0];
    check(hit !== undefined, "path Example Bank AD -> Servis One d.o.o. within 4 hops");
    if (hit !== undefined) {
      console.log(`\npath (${Number(hit.hops)} hops):\n  ${String(hit.path)}`);
    }
  }

  if (failed) {
    process.exit(1);
  }
  console.log("\nverify: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

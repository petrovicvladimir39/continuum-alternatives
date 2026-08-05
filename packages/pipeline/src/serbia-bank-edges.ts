import "./env";
import {
  createEntity,
  db,
  entities,
  entityTags,
  eq,
  organizations,
  resolveEntity,
  sql,
} from "@continuum/db";

/**
 * SERBIA DEEP RUN — the banking vendor graph ($0, deterministic).
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/serbia-bank-edges.ts
 *
 * Every Serbian company's bank accounts are public in the NBS Jedinstveni
 * registar računa, and we captured the bank names for 4,210 companies. That
 * turns into a real, sourced relationship layer:
 *
 *   company --serviced_by--> bank
 *
 * This is the kind of edge the platform's vision is built on — typed, dated,
 * sourced — and it is coverage the global providers do not carry: which bank
 * actually serves a given Serbian company.
 *
 * REVIEW GATE: the underlying registry is official (NBS), but we received it
 * through kompanije.co.rs, a tier-3 aggregator. Edges therefore land
 * PROPOSED, never auto-approved, and re-sourcing from NBS directly would be
 * what promotes them.
 *
 * Bank entities are resolved against the corpus first and only created when
 * genuinely absent, so this does not fragment the graph.
 */

/** Normalize the register's bank spelling for matching. */
function normalizeBank(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s*[-–]\s*/g, " ")
    .replace(/\bA\.?\s?D\.?\b/gi, "a.d.")
    .replace(/akcionarsko dru[sš]tvo/gi, "a.d.")
    .trim();
}

async function main(): Promise<void> {
  const rows = (
    await db.execute(sql`
      SELECT o.entity_id, o.category_fields->'nbs_banks' AS banks
      FROM organizations o JOIN entities e ON e.id = o.entity_id
      WHERE e.country = 'RS' AND o.category_fields->'nbs_banks' IS NOT NULL
    `)
  ).rows as { entity_id: string; banks: string[] | null }[];

  console.log(`serbia-bank-edges: ${rows.length} companies with NBS bank data`);

  // 1. Resolve every distinct bank once.
  const distinct = new Map<string, number>();
  for (const row of rows) {
    for (const raw of row.banks ?? []) {
      const name = normalizeBank(raw);
      if (name.length >= 4) {
        distinct.set(name, (distinct.get(name) ?? 0) + 1);
      }
    }
  }
  console.log(`  ${distinct.size} distinct banks named`);

  const bankId = new Map<string, string>();
  let banksCreated = 0;
  let banksMatched = 0;
  for (const [name] of [...distinct.entries()].sort((a, b) => b[1] - a[1])) {
    const resolved = await resolveEntity({ name, country: "RS", kindHint: "organization" });
    if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
      bankId.set(name, resolved.entityId);
      banksMatched += 1;
    } else if (resolved.outcome === "new") {
      const created = await createEntity({
        kind: "organization",
        name,
        country: "RS",
        tags: ["bank", "pilot_rs", "needs_verification"],
      });
      await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, created.id));
      await db
        .insert(organizations)
        .values({
          entityId: created.id,
          primaryRole: "Bank",
          hqCountry: "RS",
          verificationNote: "NBS Jedinstveni registar računa (via kompanije.co.rs)",
        })
        .onConflictDoNothing();
      await db
        .insert(entityTags)
        .values({ entityId: created.id, tag: "rs_sector_target" })
        .onConflictDoNothing();
      bankId.set(name, created.id);
      banksCreated += 1;
    }
    // Ambiguous bank names are skipped rather than guessed.
  }
  console.log(`  banks: ${banksMatched} matched to existing entities, ${banksCreated} created`);

  // 2. One proposed edge per (company, bank).
  let edgesCreated = 0;
  let selfSkipped = 0;
  for (const row of rows) {
    const seen = new Set<string>();
    for (const raw of row.banks ?? []) {
      const target = bankId.get(normalizeBank(raw));
      if (target === undefined || seen.has(target)) {
        continue;
      }
      seen.add(target);
      if (target === row.entity_id) {
        selfSkipped += 1; // a bank banking with itself
        continue;
      }
      // `role` carries the provenance: the edges table has no note column.
      const inserted = await db.execute(sql`
        INSERT INTO edges (source_entity_id, target_entity_id, edge_type, status, confidence, role)
        SELECT ${row.entity_id}::uuid, ${target}::uuid, 'serviced_by', 'proposed', 0.85,
               'bank account (NBS registar računa)'
        WHERE NOT EXISTS (
          SELECT 1 FROM edges x
          WHERE x.source_entity_id = ${row.entity_id}::uuid
            AND x.target_entity_id = ${target}::uuid
            AND x.edge_type = 'serviced_by')
        RETURNING id`);
      edgesCreated += inserted.rows.length;
    }
  }

  console.log(
    `\nserbia-bank-edges done: ${edgesCreated} 'serviced_by' edges PROPOSED (${selfSkipped} self-references skipped)`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

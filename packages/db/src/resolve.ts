import { companyNameCore, normalizeAlias } from "@continuum/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { aliases, entities, organizations } from "./schema";
import type { EntityKind } from "./repo/entities";

export type ResolveCandidate = {
  entityId: string;
  slug: string;
  name: string;
  score: number;
};

export type ResolveResult = {
  outcome: "matched" | "ambiguous" | "new";
  entityId?: string;
  via?: "registry_id" | "tax_id" | "alias" | "fuzzy";
  confidence?: number;
  candidates: ResolveCandidate[];
};

/**
 * Fuzzy thresholds on the best pg_trgm score s (final, benchmark-tuned):
 *   s >= MATCH_THRESHOLD                    -> matched (country agreement required)
 *   AMBIGUOUS_THRESHOLD <= s < MATCH       -> ambiguous, top-5 candidates
 *   s < AMBIGUOUS_THRESHOLD                -> new
 * Containment hits (word_similarity = candidate core fully inside a longer
 * alias, or vice versa) are capped at WORD_SIM_CAP so they can only ever
 * produce ambiguous, never an automatic merge.
 */
const MATCH_THRESHOLD = 0.93;
const AMBIGUOUS_THRESHOLD = 0.78;
const WORD_SIM_CAP = 0.9;

export async function resolveEntity(candidate: {
  name: string;
  country?: string;
  registryId?: string;
  taxId?: string;
  kindHint?: EntityKind;
}): Promise<ResolveResult> {
  // 1. DETERMINISTIC — registry/tax id exact match on organizations.
  for (const [via, value] of [
    ["registry_id", candidate.registryId],
    ["tax_id", candidate.taxId],
  ] as const) {
    if (value === undefined || value.trim() === "") {
      continue;
    }
    const column = via === "registry_id" ? organizations.registryId : organizations.taxId;
    const hits = await db
      .select({ entityId: organizations.entityId, slug: entities.slug, name: entities.name })
      .from(organizations)
      .innerJoin(entities, eq(entities.id, organizations.entityId))
      .where(eq(column, value.trim()));
    const hit = hits[0];
    if (hit) {
      return {
        outcome: "matched",
        entityId: hit.entityId,
        via,
        confidence: 1.0,
        candidates: [{ entityId: hit.entityId, slug: hit.slug, name: hit.name, score: 1.0 }],
      };
    }
  }

  const kindFilter = candidate.kindHint;
  const normalized = normalizeAlias(candidate.name);

  // 2. ALIAS-EXACT — normalized name equals an alias_normalized.
  const exactRows = await db
    .selectDistinct({ entityId: entities.id, slug: entities.slug, name: entities.name })
    .from(aliases)
    .innerJoin(entities, eq(entities.id, aliases.entityId))
    .where(
      kindFilter === undefined
        ? eq(aliases.aliasNormalized, normalized)
        : and(eq(aliases.aliasNormalized, normalized), eq(entities.kind, kindFilter)),
    );
  if (exactRows.length === 1) {
    const hit = exactRows[0];
    if (hit) {
      return {
        outcome: "matched",
        entityId: hit.entityId,
        via: "alias",
        confidence: 0.98,
        candidates: [{ entityId: hit.entityId, slug: hit.slug, name: hit.name, score: 0.98 }],
      };
    }
  }
  if (exactRows.length > 1) {
    return {
      outcome: "ambiguous",
      via: "alias",
      candidates: exactRows.map((row) => ({
        entityId: row.entityId,
        slug: row.slug,
        name: row.name,
        score: 0.98,
      })),
    };
  }

  // 3. FUZZY — pg_trgm over alias_normalized (which includes backfilled core
  // aliases). Containment scores are capped below the match threshold.
  const core = companyNameCore(candidate.name);
  const fuzzy = await db.execute(sql`
    SELECT e.id AS entity_id, e.slug, e.name, e.country,
           max(greatest(
             similarity(a.alias_normalized, ${core}),
             least(word_similarity(${core}, a.alias_normalized), ${WORD_SIM_CAP})
           )) AS score
    FROM aliases a
    JOIN entities e ON e.id = a.entity_id
    WHERE (${kindFilter ?? null}::entity_kind IS NULL OR e.kind = ${kindFilter ?? null}::entity_kind)
      AND greatest(
            similarity(a.alias_normalized, ${core}),
            least(word_similarity(${core}, a.alias_normalized), ${WORD_SIM_CAP})
          ) >= 0.45
    GROUP BY e.id, e.slug, e.name, e.country
    ORDER BY score DESC
    LIMIT 5
  `);

  const scored = fuzzy.rows.map((row) => ({
    entityId: String(row.entity_id),
    slug: String(row.slug),
    name: String(row.name),
    country: row.country === null ? null : String(row.country),
    score: Number(row.score),
  }));
  const best = scored[0];
  if (!best || best.score < AMBIGUOUS_THRESHOLD) {
    return { outcome: "new", candidates: [] };
  }

  const candidates: ResolveCandidate[] = scored.map(({ entityId, slug, name, score }) => ({
    entityId,
    slug,
    name,
    score: Math.round(score * 1000) / 1000,
  }));

  const countryConflict =
    candidate.country !== undefined &&
    candidate.country !== "" &&
    best.country !== null &&
    best.country.toUpperCase() !== candidate.country.toUpperCase();

  if (best.score >= MATCH_THRESHOLD && !countryConflict) {
    return {
      outcome: "matched",
      entityId: best.entityId,
      via: "fuzzy",
      confidence: Math.round(best.score * 1000) / 1000,
      candidates,
    };
  }
  return { outcome: "ambiguous", via: "fuzzy", candidates };
}

/**
 * Idempotent backfill. Ensures every entity is visible to resolution:
 * 1. every entity has its normalizeAlias(name) alias row (entities created
 *    before the Phase 4 repo layer have none),
 * 2. every alias whose companyNameCore differs also has that core form
 *    as an additional alias row.
 */
export async function backfillCoreAliases(): Promise<number> {
  const entityRows = await db.select({ id: entities.id, name: entities.name }).from(entities);
  const aliasRows = await db
    .select({
      entityId: aliases.entityId,
      alias: aliases.alias,
      aliasNormalized: aliases.aliasNormalized,
    })
    .from(aliases);

  const have = new Set(
    aliasRows
      .filter((row) => row.entityId !== null)
      .map((row) => `${row.entityId}:${row.aliasNormalized}`),
  );
  const wanted = new Map<string, { entityId: string; alias: string; normalized: string }>();
  const want = (entityId: string, alias: string, normalized: string) => {
    if (normalized === "") {
      return;
    }
    const key = `${entityId}:${normalized}`;
    if (!have.has(key)) {
      wanted.set(key, { entityId, alias, normalized });
    }
  };

  for (const entity of entityRows) {
    const normalized = normalizeAlias(entity.name);
    want(entity.id, entity.name, normalized);
    const core = companyNameCore(entity.name);
    if (core !== normalized) {
      want(entity.id, entity.name, core);
    }
  }
  for (const row of aliasRows) {
    if (row.entityId === null) {
      continue;
    }
    const core = companyNameCore(row.aliasNormalized);
    if (core !== row.aliasNormalized) {
      want(row.entityId, row.alias, core);
    }
  }

  let inserted = 0;
  for (const item of wanted.values()) {
    await db.insert(aliases).values({
      entityId: item.entityId,
      alias: item.alias,
      aliasNormalized: item.normalized,
    });
    inserted += 1;
  }
  return inserted;
}

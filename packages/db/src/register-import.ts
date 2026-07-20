import { companyNameCore, isEuropeCountry, normalizeAlias, slugify } from "@continuum/shared";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "./client";
import { aliases, edges, entities, entityTags, organizations } from "./schema";
import { resolveEntity } from "./resolve";

/**
 * Shared import path for REGISTER-GRADE rows (Phase: reset build Part 2).
 * Sources: GLEIF LEI records, national regulator registers (CSSF, CBI, …).
 *
 * Doctrine:
 * - registryId (LEI or national register number) is a DETERMINISTIC key:
 *   an exact registryId match merges without any fuzzy resolution.
 * - Register-grade rows ACTIVATE directly (status='active') — the register
 *   itself is the verification; no needs_verification gate.
 * - Fuzzy resolution NEVER merges two rows that both carry registryIds
 *   which differ — same-name entities with different register numbers are
 *   different entities.
 * - Ambiguous fuzzy outcomes are skipped and reported, never merged.
 * - New-entity creation is BATCHED (entities, organizations, entity_tags,
 *   aliases in bulk inserts) so register-scale runs stay tractable.
 */

export type RegisterRow = {
  name: string;
  country: string; // ISO2, must be inside EUROPE_COUNTRIES
  city?: string | null;
  website?: string | null;
  /** LEI or national register number — the deterministic resolution key. */
  registryId?: string | null;
  /** Workflow tags, e.g. ["register_verified", "lei"]. Free-text like needs_verification. */
  tags: string[];
  /** Audit note stored on organizations.verification_note for NEW entities. */
  note?: string;
};

export type RegisterImportOutcome =
  | "merged_registry" // registryId already in corpus — idempotent merge/skip
  | "merged" // name-resolved onto an existing entity
  | "created" // new active entity created
  | "ambiguous" // fuzzy resolution ambiguous — skipped, reported
  | "skipped"; // invalid row (country outside scope, empty name)

export type RegisterImportResult = {
  outcome: RegisterImportOutcome;
  entityId?: string;
  detail?: string;
};

type PendingRow = RegisterRow & { slug: string };

const BATCH_SIZE = 200;

export class RegisterImporter {
  private registryMap = new Map<string, string>(); // registryId -> entityId
  private usedSlugs = new Set<string>();
  private pending: PendingRow[] = [];
  private initialized = false;

  counts: Record<RegisterImportOutcome, number> = {
    merged_registry: 0,
    merged: 0,
    created: 0,
    ambiguous: 0,
    skipped: 0,
  };
  ambiguousRows: string[] = [];

  async init(): Promise<void> {
    const regRows = await db
      .select({ entityId: organizations.entityId, registryId: organizations.registryId })
      .from(organizations)
      .where(isNotNull(organizations.registryId));
    for (const row of regRows) {
      if (row.registryId !== null && row.entityId !== null) {
        this.registryMap.set(row.registryId, row.entityId);
      }
    }
    const slugRows = await db.select({ slug: entities.slug }).from(entities);
    for (const row of slugRows) {
      this.usedSlugs.add(row.slug);
    }
    this.initialized = true;
  }

  /** entityId for a registryId already seen (existing corpus or created this run). */
  entityIdFor(registryId: string): string | undefined {
    return this.registryMap.get(registryId);
  }

  async importRow(row: RegisterRow): Promise<RegisterImportResult> {
    if (!this.initialized) {
      throw new Error("RegisterImporter.init() must run before importRow()");
    }
    const name = row.name.trim();
    const country = row.country.trim().toUpperCase();
    if (name === "" || !isEuropeCountry(country)) {
      this.counts.skipped += 1;
      return { outcome: "skipped", detail: `invalid row (name="${name}", country="${country}")` };
    }
    const registryId = row.registryId?.trim() || null;

    // 1. Deterministic — registryId already known (idempotent re-run fast path).
    if (registryId !== null) {
      const known = this.registryMap.get(registryId);
      if (known !== undefined) {
        this.counts.merged_registry += 1;
        return { outcome: "merged_registry", entityId: known };
      }
    }

    // 2. Name resolution against the corpus (alias-exact then pg_trgm fuzzy).
    //    registryId deliberately NOT passed — step 1 already covered it from
    //    the preloaded map, saving one query per row at register scale.
    const resolved = await resolveEntity({ name, country, kindHint: "organization" });

    if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
      const orgRows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.entityId, resolved.entityId));
      const org = orgRows[0];
      // Different register numbers on both sides → different entities.
      if (
        org !== undefined &&
        org.registryId !== null &&
        registryId !== null &&
        org.registryId !== registryId
      ) {
        return this.queueCreate({ ...row, name, country, registryId });
      }
      // Country conflict on a name match → separate entity (same rule as
      // universe-import): a same-name firm in another country is different.
      const entityRows = await db
        .select({ country: entities.country })
        .from(entities)
        .where(eq(entities.id, resolved.entityId));
      const matchedCountry = entityRows[0]?.country ?? null;
      if (matchedCountry !== null && matchedCountry.toUpperCase() !== country) {
        return this.queueCreate({ ...row, name, country, registryId });
      }

      await this.mergeInto(resolved.entityId, { ...row, name, country, registryId }, org);
      this.counts.merged += 1;
      return { outcome: "merged", entityId: resolved.entityId };
    }

    if (resolved.outcome === "ambiguous") {
      this.counts.ambiguous += 1;
      this.ambiguousRows.push(
        `${name} (${country}) ~ ${resolved.candidates
          .slice(0, 3)
          .map((c) => `${c.slug}(${c.score})`)
          .join(", ")}`,
      );
      return { outcome: "ambiguous" };
    }

    return this.queueCreate({ ...row, name, country, registryId });
  }

  private async mergeInto(
    entityId: string,
    row: RegisterRow,
    org: typeof organizations.$inferSelect | undefined,
  ): Promise<void> {
    if (org === undefined) {
      await db.insert(organizations).values({
        entityId,
        registryId: row.registryId ?? null,
        hqCity: row.city || null,
        website: row.website || null,
        verificationNote: row.note ?? null,
      });
    } else {
      const patch: Partial<typeof organizations.$inferInsert> = {};
      if (org.registryId === null && row.registryId) {
        patch.registryId = row.registryId;
      }
      if (org.hqCity === null && row.city) {
        patch.hqCity = row.city;
      }
      if (org.website === null && row.website) {
        patch.website = row.website;
      }
      if (Object.keys(patch).length > 0) {
        await db.update(organizations).set(patch).where(eq(organizations.entityId, entityId));
      }
    }
    if (row.registryId) {
      this.registryMap.set(row.registryId, entityId);
    }
    if (row.tags.length > 0) {
      const existing = await db
        .select({ tag: entityTags.tag })
        .from(entityTags)
        .where(and(eq(entityTags.entityId, entityId), inArray(entityTags.tag, row.tags)));
      const have = new Set(existing.map((r) => r.tag));
      const missing = row.tags.filter((tag) => !have.has(tag));
      if (missing.length > 0) {
        await db.insert(entityTags).values(missing.map((tag) => ({ entityId, tag })));
      }
    }
  }

  private async queueCreate(row: RegisterRow): Promise<RegisterImportResult> {
    const base = slugify(row.name) || "entity";
    let slug = base;
    for (let suffix = 2; this.usedSlugs.has(slug); suffix++) {
      slug = `${base}-${suffix}`;
    }
    this.usedSlugs.add(slug);
    this.pending.push({ ...row, slug });
    this.counts.created += 1;
    if (this.pending.length >= BATCH_SIZE) {
      await this.flush();
    }
    return { outcome: "created" };
  }

  /** Bulk-insert all queued new entities. Call once more at the end of a run. */
  async flush(): Promise<void> {
    if (this.pending.length === 0) {
      return;
    }
    const batch = this.pending;
    this.pending = [];

    // Register-grade rows activate directly — the register is the verification.
    const inserted = await db
      .insert(entities)
      .values(
        batch.map((row) => ({
          kind: "organization" as const,
          name: row.name,
          slug: row.slug,
          country: row.country,
          status: "active",
        })),
      )
      .returning({ id: entities.id, slug: entities.slug });
    const idBySlug = new Map(inserted.map((r) => [r.slug, r.id]));

    const orgValues: (typeof organizations.$inferInsert)[] = [];
    const tagValues: (typeof entityTags.$inferInsert)[] = [];
    const aliasValues: (typeof aliases.$inferInsert)[] = [];
    for (const row of batch) {
      const entityId = idBySlug.get(row.slug);
      if (entityId === undefined) {
        continue;
      }
      orgValues.push({
        entityId,
        registryId: row.registryId ?? null,
        hqCity: row.city || null,
        website: row.website || null,
        verificationNote: row.note ?? null,
      });
      for (const tag of new Set(row.tags)) {
        tagValues.push({ entityId, tag });
      }
      const normalized = normalizeAlias(row.name);
      aliasValues.push({ entityId, alias: row.name, aliasNormalized: normalized });
      const core = companyNameCore(row.name);
      if (core !== normalized) {
        aliasValues.push({ entityId, alias: row.name, aliasNormalized: core });
      }
      if (row.registryId) {
        this.registryMap.set(row.registryId, entityId);
      }
    }
    if (orgValues.length > 0) {
      await db.insert(organizations).values(orgValues);
    }
    if (tagValues.length > 0) {
      await db.insert(entityTags).values(tagValues);
    }
    if (aliasValues.length > 0) {
      await db.insert(aliases).values(aliasValues);
    }
  }
}

/**
 * Insert PROPOSED manages edges (manager -> managed vehicle), deduplicated
 * against existing manages edges in either review state. Returns inserted count.
 */
export async function proposeManagesEdges(
  pairs: { managerEntityId: string; fundEntityId: string }[],
): Promise<number> {
  if (pairs.length === 0) {
    return 0;
  }
  const managerIds = [...new Set(pairs.map((p) => p.managerEntityId))];
  const existing = await db
    .select({ source: edges.sourceEntityId, target: edges.targetEntityId })
    .from(edges)
    .where(and(eq(edges.edgeType, "manages"), inArray(edges.sourceEntityId, managerIds)));
  const have = new Set(existing.map((e) => `${e.source}:${e.target}`));
  const fresh = pairs.filter((p) => !have.has(`${p.managerEntityId}:${p.fundEntityId}`));
  const deduped = [...new Map(fresh.map((p) => [`${p.managerEntityId}:${p.fundEntityId}`, p])).values()];
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const chunk = deduped.slice(i, i + BATCH_SIZE);
    await db.insert(edges).values(
      chunk.map((p) => ({
        edgeType: "manages" as const,
        sourceEntityId: p.managerEntityId,
        targetEntityId: p.fundEntityId,
        status: "proposed" as const,
        confidence: "0.97",
      })),
    );
  }
  return deduped.length;
}

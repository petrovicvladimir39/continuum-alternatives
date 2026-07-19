import { companyNameCore, normalizeAlias, slugify } from "@continuum/shared";
import { eq, ilike, inArray, like, or } from "drizzle-orm";
import { db } from "../client";
import {
  aliases,
  assets,
  deals,
  entities,
  entityKind,
  entityTags,
  events,
  fundVehicles,
  organizations,
  people,
} from "../schema";

export type EntityKind = (typeof entityKind.enumValues)[number];

export type EntityRow = typeof entities.$inferSelect;

function must<T>(row: T | undefined, label: string): T {
  if (row === undefined) {
    throw new Error(`Expected a row for ${label}`);
  }
  return row;
}

export async function requireEntityBySlug(slug: string): Promise<EntityRow> {
  const rows = await db.select().from(entities).where(eq(entities.slug, slug));
  const row = rows[0];
  if (!row) {
    throw new Error(`Unknown entity slug: "${slug}"`);
  }
  return row;
}

export async function createEntity(input: {
  kind: EntityKind;
  name: string;
  country?: string;
  tags?: string[];
  summary?: string;
}): Promise<EntityRow> {
  const base = slugify(input.name);
  let slug = base;
  for (let suffix = 2; ; suffix++) {
    const clash = await db
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.slug, slug));
    if (clash.length === 0) {
      break;
    }
    slug = `${base}-${suffix}`;
  }

  const inserted = await db
    .insert(entities)
    .values({
      kind: input.kind,
      name: input.name,
      slug,
      country: input.country ?? null,
      summary: input.summary ?? null,
    })
    .returning();
  const entity = must(inserted[0], `entity ${slug}`);

  const tags = [...new Set(input.tags ?? [])];
  if (tags.length > 0) {
    await db.insert(entityTags).values(tags.map((tag) => ({ entityId: entity.id, tag })));
  }

  const normalized = normalizeAlias(input.name);
  const core = companyNameCore(input.name);
  await db.insert(aliases).values({
    entityId: entity.id,
    alias: input.name,
    aliasNormalized: normalized,
  });
  // Matching-only core alias (legal forms stripped) so fuzzy resolution compares
  // like against like; display names stay untouched.
  if (core !== normalized) {
    await db.insert(aliases).values({
      entityId: entity.id,
      alias: input.name,
      aliasNormalized: core,
    });
  }

  return entity;
}

export type EntitySearchHit = {
  id: string;
  slug: string;
  kind: EntityKind;
  name: string;
  country: string | null;
  tags: string[];
};

export async function findEntities(query: string): Promise<EntitySearchHit[]> {
  const normalized = normalizeAlias(query);
  const rows = await db
    .selectDistinct({
      id: entities.id,
      slug: entities.slug,
      kind: entities.kind,
      name: entities.name,
      country: entities.country,
    })
    .from(entities)
    .leftJoin(aliases, eq(aliases.entityId, entities.id))
    .where(or(ilike(entities.name, `%${query}%`), like(aliases.aliasNormalized, `%${normalized}%`)))
    .orderBy(entities.name);

  if (rows.length === 0) {
    return [];
  }
  const tagRows = await db
    .select()
    .from(entityTags)
    .where(
      inArray(
        entityTags.entityId,
        rows.map((row) => row.id),
      ),
    );
  return rows.map((row) => ({
    ...row,
    tags: tagRows.filter((tag) => tag.entityId === row.id).map((tag) => tag.tag),
  }));
}

async function detailFor(
  kind: EntityKind,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  switch (kind) {
    case "organization":
      return (
        (await db.select().from(organizations).where(eq(organizations.entityId, entityId)))[0] ??
        null
      );
    case "person":
      return (await db.select().from(people).where(eq(people.entityId, entityId)))[0] ?? null;
    case "fund_vehicle":
      return (
        (await db.select().from(fundVehicles).where(eq(fundVehicles.entityId, entityId)))[0] ?? null
      );
    case "deal":
      return (await db.select().from(deals).where(eq(deals.entityId, entityId)))[0] ?? null;
    case "asset":
      return (await db.select().from(assets).where(eq(assets.entityId, entityId)))[0] ?? null;
    case "event":
      return (await db.select().from(events).where(eq(events.entityId, entityId)))[0] ?? null;
  }
}

export type EntityDetail = {
  entity: EntityRow;
  detail: Record<string, unknown> | null;
  tags: string[];
};

export async function getBySlug(slug: string): Promise<EntityDetail | null> {
  const rows = await db.select().from(entities).where(eq(entities.slug, slug));
  const entity = rows[0];
  if (!entity) {
    return null;
  }
  const detail = await detailFor(entity.kind, entity.id);
  const tagRows = await db.select().from(entityTags).where(eq(entityTags.entityId, entity.id));
  return { entity, detail, tags: tagRows.map((row) => row.tag) };
}

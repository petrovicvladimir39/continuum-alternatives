"use server";

import { CHANNELS, ENTITY_TAGS, normalizeAlias } from "@continuum/shared";
import {
  addFact,
  aliases,
  anomalies,
  articles,
  assets,
  createEdge,
  createEntity,
  db,
  deals,
  dealType,
  edges,
  edgeType,
  entities,
  entityKind,
  entityTags,
  events,
  findEntities,
  fundVehicles,
  organizations,
  people,
  requireEntityBySlug,
  resolveEntity,
  sources,
  sourceType,
  timelineFacts,
  and,
  eq,
  inArray,
  sql,
  type EdgeTypeName,
  type EntityKind,
} from "@continuum/db";
import {
  composeDigest,
  deliverDigest,
  extractDocument,
  fetchSource,
  inngest,
  persistDraft,
  type DeliveryReport,
} from "@continuum/pipeline";
import { contacts, digestItems, digests } from "@continuum/db";
import {
  decideClassificationGroup,
  removeClassification,
  upsertClassification,
} from "@continuum/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "./form-state";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      values[key] = values[key] !== undefined ? `${values[key]},${value}` : value;
    }
  }
  return values;
}

function refresh(slug: string) {
  revalidatePath(`/admin/entities/${slug}`);
  revalidatePath("/admin/review");
}

export async function searchEntitiesForPicker(
  query: string,
  kind?: string,
): Promise<{ slug: string; name: string; kind: string }[]> {
  if (query.trim() === "") {
    return [];
  }
  const hits = await findEntities(query.trim());
  return hits
    .filter((hit) => (kind === undefined ? true : hit.kind === kind))
    .slice(0, 8)
    .map((hit) => ({ slug: hit.slug, name: hit.name, kind: hit.kind }));
}

export async function createEntityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const errors: Record<string, string> = {};
  const kind = text(formData, "kind");
  const name = text(formData, "name");
  const country = text(formData, "country");
  const tagsRaw = text(formData, "tags");
  const summary = text(formData, "summary");

  if (!(entityKind.enumValues as readonly string[]).includes(kind)) {
    errors.kind = `Kind must be one of: ${entityKind.enumValues.join(", ")}`;
  }
  if (name === "") {
    errors.name = "Name is required.";
  }
  if (country !== "" && !/^[A-Za-z]{2}$/.test(country)) {
    errors.country = "Country must be a 2-letter code.";
  }
  const tags =
    tagsRaw === ""
      ? []
      : tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
  const invalidTags = tags.filter((tag) => !(ENTITY_TAGS as readonly string[]).includes(tag));
  if (invalidTags.length > 0) {
    errors.tags = `Unknown tag(s): ${invalidTags.join(", ")}. Valid tags: ${ENTITY_TAGS.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values: echo(formData) };
  }

  // Duplicate gate: resolve the name first; matched/ambiguous requires the
  // explicit "Create anyway" confirmation before an entity is created.
  if (text(formData, "createAnyway") !== "on") {
    const resolution = await resolveEntity({
      name,
      kindHint: kind as EntityKind,
      ...(country !== "" ? { country: country.toUpperCase() } : {}),
    });
    if (resolution.outcome !== "new") {
      return {
        errors: {},
        values: echo(formData),
        resolution: {
          outcome: resolution.outcome,
          ...(resolution.via !== undefined ? { via: resolution.via } : {}),
          candidates: resolution.candidates.map(({ slug, name: candidateName, score }) => ({
            slug,
            name: candidateName,
            score,
          })),
        },
      };
    }
  }

  const entity = await createEntity({
    kind: kind as EntityKind,
    name,
    ...(country !== "" ? { country: country.toUpperCase() } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(summary !== "" ? { summary } : {}),
  });
  redirect(`/admin/entities/${entity.slug}`);
}

export async function updateEntityAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const errors: Record<string, string> = {};
  const slug = text(formData, "slug");
  const name = text(formData, "name");
  const country = text(formData, "country");
  const summary = text(formData, "summary");

  if (name === "") {
    errors.name = "Name is required.";
  }
  if (country !== "" && !/^[A-Za-z]{2}$/.test(country)) {
    errors.country = "Country must be a 2-letter code.";
  }
  if (Object.keys(errors).length > 0) {
    return { errors, values: echo(formData) };
  }

  const entity = await requireEntityBySlug(slug);
  await db
    .update(entities)
    .set({
      name,
      country: country === "" ? null : country.toUpperCase(),
      summary: summary === "" ? null : summary,
      updatedAt: sql`now()`,
    })
    .where(eq(entities.id, entity.id));

  const detail = (key: string) => {
    const value = text(formData, `detail_${key}`);
    return value === "" ? null : value;
  };
  const detailInt = (key: string) => {
    const value = text(formData, `detail_${key}`);
    if (value === "") {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const detailTimestamp = (key: string) => {
    const value = text(formData, `detail_${key}`);
    if (value === "") {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  switch (entity.kind) {
    case "organization": {
      const values = {
        legalName: detail("legalName"),
        registryId: detail("registryId"),
        taxId: detail("taxId"),
        hqCity: detail("hqCity"),
        foundedYear: detailInt("foundedYear"),
        website: detail("website"),
        employeeRange: detail("employeeRange"),
      };
      await db
        .insert(organizations)
        .values({ entityId: entity.id, ...values })
        .onConflictDoUpdate({ target: organizations.entityId, set: values });
      break;
    }
    case "person": {
      const values = {
        displayName: detail("displayName") ?? name,
        roleTitle: detail("roleTitle"),
        linkedinUrl: detail("linkedinUrl"),
      };
      await db
        .insert(people)
        .values({ entityId: entity.id, ...values })
        .onConflictDoUpdate({ target: people.entityId, set: values });
      break;
    }
    case "fund_vehicle": {
      const managerSlug = text(formData, "detail_managerSlug");
      let managerEntityId: string | null = null;
      if (managerSlug !== "") {
        try {
          managerEntityId = (await requireEntityBySlug(managerSlug)).id;
        } catch {
          return {
            errors: { detail_managerSlug: `Unknown entity slug "${managerSlug}".` },
            values: echo(formData),
          };
        }
      }
      const values = {
        managerEntityId,
        vintageYear: detailInt("vintageYear"),
        targetSize: detail("targetSize"),
        currency: detail("currency"),
        strategy: detail("strategy"),
        status: detail("status"),
      };
      await db
        .insert(fundVehicles)
        .values({ entityId: entity.id, ...values })
        .onConflictDoUpdate({ target: fundVehicles.entityId, set: values });
      break;
    }
    case "deal": {
      const kindValue = text(formData, "detail_dealType");
      if (!(dealType.enumValues as readonly string[]).includes(kindValue)) {
        return { errors: { detail_dealType: "Invalid deal type." }, values: echo(formData) };
      }
      const values = {
        dealType: kindValue as (typeof dealType.enumValues)[number],
        announcedOn: detail("announcedOn"),
        amount: detail("amount"),
        currency: detail("currency"),
        dealStatus: detail("dealStatus"),
      };
      await db
        .insert(deals)
        .values({ entityId: entity.id, ...values })
        .onConflictDoUpdate({ target: deals.entityId, set: values });
      break;
    }
    case "asset": {
      const kindValue = text(formData, "detail_assetType");
      if (!(assets.assetType.enumValues as readonly string[]).includes(kindValue)) {
        return { errors: { detail_assetType: "Invalid asset type." }, values: echo(formData) };
      }
      const values = {
        assetType: kindValue as (typeof assets.assetType.enumValues)[number],
        nominalValue: detail("nominalValue"),
        currency: detail("currency"),
      };
      await db
        .insert(assets)
        .values({ entityId: entity.id, ...values })
        .onConflictDoUpdate({ target: assets.entityId, set: values });
      break;
    }
    case "event": {
      const kindValue = text(formData, "detail_eventFormat");
      if (!(events.eventFormat.enumValues as readonly string[]).includes(kindValue)) {
        return { errors: { detail_eventFormat: "Invalid event format." }, values: echo(formData) };
      }
      const values = {
        eventFormat: kindValue as (typeof events.eventFormat.enumValues)[number],
        startsAt: detailTimestamp("startsAt"),
        endsAt: detailTimestamp("endsAt"),
        venue: detail("venue"),
        city: detail("city"),
        eventUrl: detail("eventUrl"),
      };
      await db
        .insert(events)
        .values({ entityId: entity.id, ...values })
        .onConflictDoUpdate({ target: events.entityId, set: values });
      break;
    }
  }

  refresh(slug);
  return { errors: {}, values: { saved: "1" } };
}

export async function addTagAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = text(formData, "slug");
  const tag = text(formData, "tag");
  if (!(ENTITY_TAGS as readonly string[]).includes(tag)) {
    return {
      errors: { tag: `Unknown tag "${tag}". Valid tags: ${ENTITY_TAGS.join(", ")}` },
      values: echo(formData),
    };
  }
  const entity = await requireEntityBySlug(slug);
  await db.insert(entityTags).values({ entityId: entity.id, tag }).onConflictDoNothing();
  refresh(slug);
  return { errors: {}, values: {} };
}

export async function removeTagAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const tag = text(formData, "tag");
  const entity = await requireEntityBySlug(slug);
  await db
    .delete(entityTags)
    .where(and(eq(entityTags.entityId, entity.id), eq(entityTags.tag, tag)));
  refresh(slug);
}

export async function addAliasAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const alias = text(formData, "alias");
  const lang = text(formData, "lang");
  if (alias === "") {
    return;
  }
  const entity = await requireEntityBySlug(slug);
  await db.insert(aliases).values({
    entityId: entity.id,
    alias,
    aliasNormalized: normalizeAlias(alias),
    lang: lang === "" ? null : lang.toLowerCase(),
  });
  refresh(slug);
}

export async function addEdgeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const errors: Record<string, string> = {};
  const slug = text(formData, "slug");
  const type = text(formData, "type");
  const direction = text(formData, "direction");
  const counterpart = text(formData, "counterpart");
  const deal = text(formData, "deal");
  const role = text(formData, "role");
  const date = text(formData, "date");
  const amount = text(formData, "amount");
  const currency = text(formData, "currency");
  const status = text(formData, "status");

  if (!(edgeType.enumValues as readonly string[]).includes(type)) {
    errors.type = "Invalid edge type.";
  }
  if (counterpart === "") {
    errors.counterpart = "Pick a counterpart entity.";
  }
  if (direction !== "out" && direction !== "in") {
    errors.direction = "Pick a direction.";
  }
  if (date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = "Date must be YYYY-MM-DD.";
  }
  if (currency !== "" && !/^[A-Za-z]{3}$/.test(currency)) {
    errors.currency = "Currency must be a 3-letter code.";
  }
  if (status !== "approved" && status !== "proposed") {
    errors.status = "Status must be approved or proposed.";
  }
  if (Object.keys(errors).length > 0) {
    return { errors, values: echo(formData) };
  }

  try {
    await createEdge({
      edgeType: type as EdgeTypeName,
      sourceSlug: direction === "out" ? slug : counterpart,
      targetSlug: direction === "out" ? counterpart : slug,
      ...(deal !== "" ? { dealSlug: deal } : {}),
      ...(role !== "" ? { role } : {}),
      ...(date !== "" ? { startedOn: date } : {}),
      ...(amount !== "" ? { amount } : {}),
      ...(currency !== "" ? { currency: currency.toUpperCase() } : {}),
      status: status as "approved" | "proposed",
    });
  } catch (err) {
    return {
      errors: { form: err instanceof Error ? err.message : "Failed to create edge." },
      values: echo(formData),
    };
  }
  refresh(slug);
  redirect(`/admin/entities/${slug}`);
}

export async function deleteEdgeAction(formData: FormData): Promise<void> {
  const slug = text(formData, "slug");
  const edgeId = text(formData, "edgeId");
  // Only proposed edges are deletable; approved edges are immutable from this UI.
  await db.delete(edges).where(and(eq(edges.id, edgeId), eq(edges.status, "proposed")));
  refresh(slug);
}

export async function addFactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const errors: Record<string, string> = {};
  const slug = text(formData, "slug");
  const factType = text(formData, "factType");
  const date = text(formData, "date");
  const title = text(formData, "title");
  const body = text(formData, "body");
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((c) => c !== "");

  if (factType === "") {
    errors.factType = "Fact type is required.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date = "Date must be YYYY-MM-DD.";
  }
  if (title === "") {
    errors.title = "Title is required.";
  }
  const invalidChannels = channels.filter((c) => !(CHANNELS as readonly string[]).includes(c));
  if (invalidChannels.length > 0) {
    errors.channels = `Unknown channel(s): ${invalidChannels.join(", ")}`;
  }
  if (Object.keys(errors).length > 0) {
    return { errors, values: echo(formData) };
  }

  await addFact({
    entitySlug: slug,
    factType,
    occurredOn: date,
    title,
    ...(body !== "" ? { body } : {}),
    channels,
  });
  refresh(slug);
  redirect(`/admin/entities/${slug}`);
}

/** Approving an item promotes any provisional entities it references. */
async function promoteEntities(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) {
    return;
  }
  await db
    .update(entities)
    .set({ status: "active" })
    .where(and(inArray(entities.id, unique), eq(entities.status, "provisional")));
}

async function setEdgeStatus(edgeId: string, status: "approved" | "rejected") {
  const rows = await db.select().from(edges).where(eq(edges.id, edgeId));
  const edge = rows[0];
  if (!edge || edge.status !== "proposed") {
    return;
  }
  await db
    .update(edges)
    .set({ status, verifiedBy: "admin-review" })
    .where(and(eq(edges.id, edgeId), eq(edges.status, "proposed")));
  if (status === "approved") {
    await promoteEntities(
      [edge.sourceEntityId, edge.targetEntityId, edge.dealEntityId].filter(
        (id): id is string => id !== null,
      ),
    );
  }
  revalidatePath("/admin/review");
}

const SCHEDULES = ["hourly", "daily", "weekly"];
const FETCH_METHODS = ["http_simple", "rss", "firecrawl_index", "registry_custom"];

function validateSource(formData: FormData): {
  errors: Record<string, string>;
  values: {
    name: string;
    url: string;
    country: string | null;
    sourceType: (typeof sourceType.enumValues)[number];
    fetchMethod: string;
    schedule: string;
    active: boolean;
    config: Record<string, unknown>;
  };
} {
  const errors: Record<string, string> = {};
  const name = text(formData, "name");
  const url = text(formData, "url");
  const country = text(formData, "country");
  const type = text(formData, "sourceType");
  const fetchMethod = text(formData, "fetchMethod");
  const schedule = text(formData, "schedule");
  const configRaw = text(formData, "config");

  if (name === "") {
    errors.name = "Name is required.";
  }
  if (!/^https?:\/\/.+/.test(url)) {
    errors.url = "URL must start with http:// or https://.";
  }
  if (country !== "" && !/^[A-Za-z]{2}$/.test(country)) {
    errors.country = "Country must be a 2-letter code.";
  }
  if (!(sourceType.enumValues as readonly string[]).includes(type)) {
    errors.sourceType = `Type must be one of: ${sourceType.enumValues.join(", ")}`;
  }
  if (!FETCH_METHODS.includes(fetchMethod)) {
    errors.fetchMethod = `Fetch method must be one of: ${FETCH_METHODS.join(", ")}`;
  }
  if (!SCHEDULES.includes(schedule)) {
    errors.schedule = `Schedule must be one of: ${SCHEDULES.join(", ")}`;
  }

  let config: Record<string, unknown> = {};
  if (configRaw !== "") {
    try {
      const parsed: unknown = JSON.parse(configRaw);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        errors.config = "Config must be a JSON object.";
      } else {
        config = parsed as Record<string, unknown>;
      }
    } catch {
      errors.config = 'Config must be valid JSON (e.g. {"maxItemsPerRun": 5}).';
    }
  }
  if (config.linkIncludePattern !== undefined && typeof config.linkIncludePattern === "string") {
    try {
      new RegExp(config.linkIncludePattern);
    } catch {
      errors.config = "config.linkIncludePattern is not a valid regex.";
    }
  }

  return {
    errors,
    values: {
      name,
      url,
      country: country === "" ? null : country.toUpperCase(),
      sourceType: type as (typeof sourceType.enumValues)[number],
      fetchMethod,
      schedule,
      active: formData.get("active") === "on",
      config,
    },
  };
}

export async function createSourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { errors, values } = validateSource(formData);
  if (Object.keys(errors).length > 0) {
    return { errors, values: echo(formData) };
  }
  const inserted = await db.insert(sources).values(values).returning({ id: sources.id });
  const id = inserted[0]?.id;
  if (id === undefined) {
    return { errors: { form: "Insert failed." }, values: echo(formData) };
  }
  revalidatePath("/admin/sources");
  redirect(`/admin/sources/${id}`);
}

export async function updateSourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const sourceId = text(formData, "sourceId");
  const { errors, values } = validateSource(formData);
  if (Object.keys(errors).length > 0) {
    return { errors, values: echo(formData) };
  }
  await db.update(sources).set(values).where(eq(sources.id, sourceId));
  revalidatePath("/admin/sources");
  revalidatePath(`/admin/sources/${sourceId}`);
  return { errors: {}, values: { saved: "1" } };
}

export async function toggleSourceActiveAction(formData: FormData): Promise<void> {
  const sourceId = text(formData, "sourceId");
  await db
    .update(sources)
    .set({ active: sql`NOT coalesce(${sources.active}, false)` })
    .where(eq(sources.id, sourceId));
  revalidatePath("/admin/sources");
  revalidatePath(`/admin/sources/${sourceId}`);
}

/**
 * Classification review + operator editing (Phase 26). Keyword proposals
 * never auto-approve — these actions are the human gate; operator-added
 * rows are approved at source.
 */
export async function classificationGroupAction(formData: FormData): Promise<void> {
  const assetClass = text(formData, "assetClass");
  const strategy = formData.get("strategy");
  const decision = text(formData, "decision") === "approved" ? "approved" : "rejected";
  if (assetClass === "" || typeof strategy !== "string") {
    return;
  }
  await decideClassificationGroup(assetClass, strategy, decision);
  revalidatePath("/admin/review");
  revalidatePath("/admin/universe");
  revalidatePath("/coverage");
}

export async function addEntityClassificationAction(formData: FormData): Promise<void> {
  const entityId = text(formData, "entityId");
  const slug = text(formData, "slug");
  // The editor posts one "<class>:<strategy>" pair ('' strategy = class-level).
  const pair = text(formData, "pair");
  const [assetClass, strategy] = pair.includes(":") ? pair.split(":") : ["", undefined];
  if (entityId === "" || !assetClass || strategy === undefined) {
    return;
  }
  await upsertClassification({
    entityId,
    assetClass,
    strategy,
    source: "operator",
    status: "approved",
  });
  revalidatePath(`/admin/entities/${slug}`);
  revalidatePath("/coverage");
}

export async function removeEntityClassificationAction(formData: FormData): Promise<void> {
  const entityId = text(formData, "entityId");
  const slug = text(formData, "slug");
  const assetClass = text(formData, "assetClass");
  const strategy = formData.get("strategy");
  if (entityId === "" || assetClass === "" || typeof strategy !== "string") {
    return;
  }
  await removeClassification(entityId, assetClass, strategy);
  revalidatePath(`/admin/entities/${slug}`);
  revalidatePath("/coverage");
}

/**
 * News Desk article review (reset build Part 6). Headline/deck/body stay
 * editable while proposed; Approve → published stamps published_at; there
 * is NO auto-publish path anywhere.
 */
export async function updateArticleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const articleId = text(formData, "articleId");
  const headline = text(formData, "headline");
  const deck = text(formData, "deck");
  const bodyMd = text(formData, "bodyMd");
  const errors: Record<string, string> = {};
  if (headline === "" || headline.length > 90) {
    errors.headline = "Headline is required, max 90 characters.";
  }
  if (deck.length > 160) {
    errors.deck = "Deck max 160 characters.";
  }
  if (bodyMd.length < 100) {
    errors.bodyMd = "Body too short.";
  }
  if (Object.keys(errors).length > 0) {
    return { errors, values: echo(formData) };
  }
  await db
    .update(articles)
    .set({ headline, deck: deck === "" ? null : deck, bodyMd })
    .where(and(eq(articles.id, articleId), eq(articles.status, "proposed")));
  revalidatePath(`/admin/review/article/${articleId}`);
  revalidatePath("/admin/review");
  return { errors: {}, values: { saved: "1" } };
}

export async function approveArticleAction(formData: FormData): Promise<void> {
  const articleId = text(formData, "articleId");
  await db
    .update(articles)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(articles.id, articleId), eq(articles.status, "proposed")));
  revalidatePath("/admin/review");
  revalidatePath("/news");
  revalidatePath("/");
  redirect("/admin/review?filter=articles");
}

export async function rejectArticleAction(formData: FormData): Promise<void> {
  const articleId = text(formData, "articleId");
  await db
    .update(articles)
    .set({ status: "rejected" })
    .where(and(eq(articles.id, articleId), eq(articles.status, "proposed")));
  revalidatePath("/admin/review");
  redirect("/admin/review?filter=articles");
}

/**
 * Bulk tag add/remove over the universe filtered view (reset build Part 5).
 * Applies to EVERY entity matching the filter, not just the visible page.
 */
export async function bulkTagAction(formData: FormData): Promise<void> {
  const country = text(formData, "country").toUpperCase();
  const tag = text(formData, "tag");
  const status = text(formData, "status");
  const kind = text(formData, "kind");
  const bulkTag = text(formData, "bulkTag");
  const op = text(formData, "op");
  if (bulkTag === "" || !/^[a-z0-9_]+$/.test(bulkTag)) {
    return;
  }
  const filterSql = sql`
    SELECT e.id FROM entities e
    WHERE (${country === "" ? null : country}::text IS NULL OR e.country = ${country === "" ? null : country})
      AND (${kind === "" ? null : kind}::text IS NULL OR e.kind::text = ${kind === "" ? null : kind})
      AND (${status === "" ? null : status}::text IS NULL OR e.status = ${status === "" ? null : status})
      AND (${tag === "" ? null : tag}::text IS NULL OR EXISTS
             (SELECT 1 FROM entity_tags t WHERE t.entity_id = e.id AND t.tag = ${tag === "" ? null : tag}))
  `;
  if (op === "remove") {
    await db.execute(sql`
      DELETE FROM entity_tags WHERE tag = ${bulkTag} AND entity_id IN (${filterSql})
    `);
  } else {
    await db.execute(sql`
      INSERT INTO entity_tags (entity_id, tag)
      SELECT id, ${bulkTag} FROM (${filterSql}) f(id)
      ON CONFLICT DO NOTHING
    `);
  }
  revalidatePath("/admin/universe");
}

/**
 * Bulk activate/deactivate sources by country + type (reset build Part 4d).
 * The cost estimate shown at the point of decision lives in the sources page;
 * this action only flips the matching group.
 */
export async function bulkSetSourcesActiveAction(formData: FormData): Promise<void> {
  const country = text(formData, "country");
  const type = text(formData, "sourceType");
  const activate = text(formData, "activate") === "1";
  const conditions = [eq(sources.active, !activate)];
  if (country !== "" && country !== "all") {
    conditions.push(eq(sources.country, country));
  }
  if (type !== "" && type !== "all") {
    conditions.push(eq(sources.sourceType, type as (typeof sourceType.enumValues)[number]));
  }
  await db
    .update(sources)
    .set({ active: activate })
    .where(and(...conditions));
  revalidatePath("/admin/sources");
}

export async function fetchNowAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const sourceId = text(formData, "sourceId");
  const done = () => {
    revalidatePath("/admin/sources");
    revalidatePath(`/admin/sources/${sourceId}`);
  };
  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send({ name: "source/fetch.requested", data: { sourceId } });
    done();
    return {
      errors: {},
      values: { message: "Queued via Inngest (event source/fetch.requested)." },
    };
  }
  try {
    const result = await fetchSource(sourceId);
    done();
    const summary =
      result.kind === "crawl"
        ? `found ${result.itemsInFeed}, new ${result.newArticles}, skipped ${result.skippedExisting}, errors ${result.errors.length}`
        : `changed=${result.changed}${
            result.documentId !== undefined ? `, document ${result.documentId}` : ""
          }`;
    return {
      errors: {},
      values: { message: `Ran directly (no INNGEST_EVENT_KEY set): ${summary}` },
    };
  } catch (err) {
    done();
    return {
      errors: {
        form: `Ran directly (no INNGEST_EVENT_KEY set) — fetch failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      values: {},
    };
  }
}

export async function approveEdgeAction(formData: FormData): Promise<void> {
  await setEdgeStatus(text(formData, "edgeId"), "approved");
}

export async function rejectEdgeAction(formData: FormData): Promise<void> {
  await setEdgeStatus(text(formData, "edgeId"), "rejected");
}

// Editing proposed rows (e.g. channels) is legitimate — immutability begins at
// approval; these status flips are the sanctioned exception to the timeline
// append-only rule.
async function approveFact(factId: string, channels?: string[]) {
  const rows = await db.select().from(timelineFacts).where(eq(timelineFacts.id, factId));
  const fact = rows[0];
  if (!fact || fact.status !== "proposed") {
    return;
  }
  await db
    .update(timelineFacts)
    .set({
      ...(channels !== undefined ? { audienceChannels: channels } : {}),
      status: "approved",
    })
    .where(and(eq(timelineFacts.id, factId), eq(timelineFacts.status, "proposed")));
  const data = (fact.data ?? {}) as Record<string, unknown>;
  const referenced = Array.isArray(data.entities) ? data.entities.map(String) : [];
  await promoteEntities([fact.entityId, ...referenced]);
}

export async function approveFactAction(formData: FormData): Promise<void> {
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((channel) => (CHANNELS as readonly string[]).includes(channel));
  await approveFact(text(formData, "factId"), channels);
  revalidatePath("/admin/review");
}

/**
 * Batch approval of everything visible under the current filter, capped at 20
 * items; applies each row's stored channels as-is. Gated behind an explicit
 * confirm checkbox in the form. Never auto-invoked.
 */
export async function approveAllVisibleAction(formData: FormData): Promise<void> {
  if (formData.get("confirm") !== "on") {
    return;
  }
  const factIds = text(formData, "factIds").split(",").filter(Boolean);
  const edgeIds = text(formData, "edgeIds").split(",").filter(Boolean);
  const budget = 20;
  const facts = factIds.slice(0, budget);
  const edgesToApprove = edgeIds.slice(0, Math.max(0, budget - facts.length));
  for (const factId of facts) {
    await approveFact(factId);
  }
  for (const edgeId of edgesToApprove) {
    await setEdgeStatus(edgeId, "approved");
  }
  revalidatePath("/admin/review");
}

export async function rejectFactAction(formData: FormData): Promise<void> {
  // Reject leaves provisional entities untouched.
  await db
    .update(timelineFacts)
    .set({ status: "rejected" })
    .where(
      and(eq(timelineFacts.id, text(formData, "factId")), eq(timelineFacts.status, "proposed")),
    );
  revalidatePath("/admin/review");
}

export async function deleteProvisionalAction(formData: FormData): Promise<void> {
  const entityId = text(formData, "entityId");
  const rows = await db.select().from(entities).where(eq(entities.id, entityId));
  const entity = rows[0];
  if (!entity || entity.status !== "provisional") {
    return;
  }
  await db.delete(entityTags).where(eq(entityTags.entityId, entityId));
  await db.delete(aliases).where(eq(aliases.entityId, entityId));
  await db.delete(organizations).where(eq(organizations.entityId, entityId));
  await db.delete(people).where(eq(people.entityId, entityId));
  await db.delete(fundVehicles).where(eq(fundVehicles.entityId, entityId));
  await db.delete(deals).where(eq(deals.entityId, entityId));
  await db.delete(assets).where(eq(assets.entityId, entityId));
  await db.delete(events).where(eq(events.entityId, entityId));
  await db.delete(entities).where(eq(entities.id, entityId));
  revalidatePath("/admin/review");
}

export async function generateDigestAction(): Promise<FormState> {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db
    .select({ id: digests.id })
    .from(digests)
    .where(eq(digests.digestDate, today));
  if (existing.length > 0) {
    return { errors: {}, values: { message: `A digest for ${today} already exists.` } };
  }
  const composition = await composeDigest(today);
  const itemCount = composition.sections.reduce((sum, section) => sum + section.items.length, 0);
  if (itemCount === 0) {
    return {
      errors: {},
      values: { message: "No eligible approved facts in the 7-day window — nothing to draft." },
    };
  }
  const digestId = await persistDraft(composition);
  revalidatePath("/admin/digests");
  redirect(`/admin/digests/${digestId}`);
}

export async function toggleDigestItemAction(formData: FormData): Promise<void> {
  const itemId = text(formData, "itemId");
  const digestId = text(formData, "digestId");
  const digestRows = await db.select().from(digests).where(eq(digests.id, digestId));
  if (digestRows[0]?.status !== "draft") {
    return; // include/exclude is a draft-only edit
  }
  await db
    .update(digestItems)
    .set({ included: sql`NOT coalesce(${digestItems.included}, true)` })
    .where(eq(digestItems.id, itemId));
  revalidatePath(`/admin/digests/${digestId}`);
}

async function deliverAndRecord(digestId: string): Promise<DeliveryReport> {
  const report = await deliverDigest(digestId);
  const complete = report.email.status === "sent";
  await db
    .update(digests)
    .set({
      delivery: report,
      ...(complete ? { status: "sent", sentAt: new Date() } : {}),
    })
    .where(eq(digests.id, digestId));
  revalidatePath("/admin/digests");
  revalidatePath(`/admin/digests/${digestId}`);
  revalidatePath("/digest");
  return report;
}

function deliveryMessage(report: DeliveryReport): string {
  const email =
    report.email.status === "skipped"
      ? `email skipped (${report.email.reason ?? "unknown"})`
      : `email ${report.email.status}: ${report.email.sent} sent${
          report.email.failed.length > 0 ? `, ${report.email.failed.length} failed` : ""
        }${report.email.reason !== undefined ? ` (${report.email.reason})` : ""}`;
  return `Telegram: ${report.telegram} · ${email}`;
}

export async function approveAndSendDigestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (formData.get("confirm") !== "on") {
    return { errors: { form: "Confirmation required." }, values: {} };
  }
  const digestId = text(formData, "digestId");
  const rows = await db.select().from(digests).where(eq(digests.id, digestId));
  if (rows[0]?.status !== "draft") {
    return { errors: { form: "Only drafts can be approved." }, values: {} };
  }
  await db.update(digests).set({ status: "approved" }).where(eq(digests.id, digestId));
  const report = await deliverAndRecord(digestId);
  return { errors: {}, values: { message: `Approved. ${deliveryMessage(report)}` } };
}

/** Retry path for approved-but-unsent digests (e.g. Resend key was missing). */
export async function sendDigestAgainAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const digestId = text(formData, "digestId");
  const rows = await db.select().from(digests).where(eq(digests.id, digestId));
  if (rows[0]?.status !== "approved") {
    return { errors: { form: "Only approved, unsent digests can be re-sent." }, values: {} };
  }
  const report = await deliverAndRecord(digestId);
  return { errors: {}, values: { message: deliveryMessage(report) } };
}

export async function addContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email").toLowerCase();
  const name = text(formData, "name");
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((channel) => (CHANNELS as readonly string[]).includes(channel));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { errors: { email: "Valid email required." }, values: echo(formData) };
  }
  if (channels.length === 0) {
    return { errors: { channels: "Pick at least one channel." }, values: echo(formData) };
  }
  const existing = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.email, email));
  if (existing.length > 0) {
    return { errors: { email: "Contact already exists." }, values: echo(formData) };
  }
  await db.insert(contacts).values({
    email,
    name: name === "" ? null : name,
    channels,
    consentSource: "operator",
    consentedAt: new Date(),
  });
  revalidatePath("/admin/contacts");
  return { errors: {}, values: { message: `Added ${email}.` } };
}

export async function toggleContactUnsubscribedAction(formData: FormData): Promise<void> {
  const contactId = text(formData, "contactId");
  const rows = await db.select().from(contacts).where(eq(contacts.id, contactId));
  const contact = rows[0];
  if (!contact) {
    return;
  }
  await db
    .update(contacts)
    .set({ unsubscribedAt: contact.unsubscribedAt === null ? new Date() : null })
    .where(eq(contacts.id, contactId));
  revalidatePath("/admin/contacts");
}

export async function dismissAnomalyAction(formData: FormData): Promise<void> {
  await db
    .update(anomalies)
    .set({ status: "dismissed" })
    .where(and(eq(anomalies.id, text(formData, "anomalyId")), eq(anomalies.status, "new")));
  revalidatePath("/admin/anomalies");
}

export async function extractNowAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const documentId = text(formData, "documentId");
  const done = () => {
    revalidatePath(`/admin/documents/${documentId}`);
    revalidatePath("/admin/documents");
    revalidatePath("/admin/review");
  };
  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send({ name: "document/stored", data: { documentId } });
    done();
    return {
      errors: {},
      values: { message: "Queued via Inngest (event document/stored)." },
    };
  }
  try {
    const result = await extractDocument(documentId, { force: true });
    done();
    return {
      errors: {},
      values: {
        message: `Ran directly (no INNGEST_EVENT_KEY set): ${result.status}, items ${result.items}, facts ${result.factsStored}, edges ${result.edgesStored}, entities matched ${result.entitiesMatched} / provisional ${result.entitiesProvisional} / ambiguous ${result.entitiesAmbiguous}`,
      },
    };
  } catch (err) {
    done();
    return {
      errors: {
        form: `Extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      values: {},
    };
  }
}

export async function approveEnrichmentAction(formData: FormData): Promise<void> {
  const entityId = text(formData, "entityId");
  if (entityId === "") {
    return;
  }
  const rows = await db
    .select({ enrichment: organizations.enrichment, foundedYear: organizations.foundedYear })
    .from(organizations)
    .where(eq(organizations.entityId, entityId));
  const row = rows[0];
  const enrichment = (row?.enrichment ?? null) as Record<string, unknown> | null;
  if (enrichment === null) {
    return;
  }
  const proposed = (enrichment.proposed ?? {}) as Record<string, string | number>;
  if (Object.keys(proposed).length === 0) {
    return;
  }
  // founded_year has a real column; the other approved fields live in the
  // enrichment jsonb under `approved` and render in the profile stat band.
  const foundedYear =
    typeof proposed.founded_year === "number" ? proposed.founded_year : undefined;
  const approvedPrev = (enrichment.approved ?? {}) as Record<string, string | number>;
  await db
    .update(organizations)
    .set({
      ...(foundedYear !== undefined ? { foundedYear } : {}),
      enrichment: {
        ...enrichment,
        approved: { ...approvedPrev, ...proposed },
        proposed: {},
      },
    })
    .where(eq(organizations.entityId, entityId));
  revalidatePath("/admin/review");
}

export async function rejectEnrichmentAction(formData: FormData): Promise<void> {
  const entityId = text(formData, "entityId");
  if (entityId === "") {
    return;
  }
  const rows = await db
    .select({ enrichment: organizations.enrichment })
    .from(organizations)
    .where(eq(organizations.entityId, entityId));
  const enrichment = (rows[0]?.enrichment ?? null) as Record<string, unknown> | null;
  if (enrichment === null) {
    return;
  }
  await db
    .update(organizations)
    .set({ enrichment: { ...enrichment, proposed: {} } })
    .where(eq(organizations.entityId, entityId));
  revalidatePath("/admin/review");
}

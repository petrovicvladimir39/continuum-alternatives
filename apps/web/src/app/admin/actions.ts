"use server";

import { CHANNELS, ENTITY_TAGS, normalizeAlias } from "@continuum/shared";
import {
  addFact,
  aliases,
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
  timelineFacts,
  and,
  eq,
  sql,
  type EdgeTypeName,
  type EntityKind,
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

async function setEdgeStatus(edgeId: string, status: "approved" | "rejected") {
  await db
    .update(edges)
    .set({ status, verifiedBy: "admin-review" })
    .where(and(eq(edges.id, edgeId), eq(edges.status, "proposed")));
  revalidatePath("/admin/review");
}

async function setFactStatus(factId: string, status: "approved" | "rejected") {
  // Review-status flips are the sanctioned exception to the append-only rule.
  await db
    .update(timelineFacts)
    .set({ status })
    .where(and(eq(timelineFacts.id, factId), eq(timelineFacts.status, "proposed")));
  revalidatePath("/admin/review");
}

export async function approveEdgeAction(formData: FormData): Promise<void> {
  await setEdgeStatus(text(formData, "edgeId"), "approved");
}

export async function rejectEdgeAction(formData: FormData): Promise<void> {
  await setEdgeStatus(text(formData, "edgeId"), "rejected");
}

export async function approveFactAction(formData: FormData): Promise<void> {
  await setFactStatus(text(formData, "factId"), "approved");
}

export async function rejectFactAction(formData: FormData): Promise<void> {
  await setFactStatus(text(formData, "factId"), "rejected");
}

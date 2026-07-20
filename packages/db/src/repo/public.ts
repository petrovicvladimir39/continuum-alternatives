import { normalizeAlias } from "@continuum/shared";
import {
  and,
  asc,
  cosineDistance,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  like,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../client";
import {
  aliases,
  deals,
  documents,
  edges,
  entities,
  entityTags,
  fundVehicles,
  organizations,
  sources,
  timelineFacts,
} from "../schema";
import type { EdgeTypeName } from "./edges";
import type { EntityKind, EntityRow } from "./entities";

/** The three publicly routable kinds. People pages are deliberately excluded (GDPR). */
export type PublicKind = "organization" | "fund_vehicle" | "deal";

export const PUBLIC_KIND_PATHS: Record<PublicKind, string> = {
  organization: "companies",
  fund_vehicle: "funds",
  deal: "deals",
};

const PUBLIC_KINDS = Object.keys(PUBLIC_KIND_PATHS) as PublicKind[];

/** Public URL for an entity, or null when the kind has no public page (person/asset/event). */
export function publicPathFor(kind: EntityKind, slug: string): string | null {
  const base = (PUBLIC_KIND_PATHS as Partial<Record<EntityKind, string>>)[kind];
  return base === undefined ? null : `/${base}/${slug}`;
}

/**
 * Direction phrasing per edge type, read from the profiled entity's side:
 * `out` when the entity is the edge SOURCE, `in` when it is the TARGET.
 * Follows the SOURCE -[edge_type]-> TARGET semantics documented in schema/edges.ts.
 */
export const EDGE_PHRASES: Record<EdgeTypeName, { out: string; in: string }> = {
  invested_in: { out: "Invested in", in: "Received investment from" },
  lp_in: { out: "LP in", in: "Counts as LP" },
  manages: { out: "Manages", in: "Managed by" },
  acquired: { out: "Acquired", in: "Acquired by" },
  advised_on: { out: "Advised", in: "Advised by" },
  lent_to: { out: "Lent to", in: "Borrowed from" },
  pledged_collateral_for: { out: "Pledged collateral for", in: "Holds collateral pledged by" },
  serviced_by: { out: "Serviced by", in: "Services" },
  sold_portfolio_to: { out: "Sold portfolio to", in: "Bought portfolio from" },
  founded: { out: "Founded", in: "Founded by" },
  employed_by: { out: "Employed by", in: "Employs" },
  board_member_of: { out: "Board member of", in: "Board includes" },
  co_invested_with: { out: "Co-invested with", in: "Co-invested with" },
  regulated_by: { out: "Regulated by", in: "Regulates" },
  litigated_against: { out: "Litigated against", in: "Faces litigation from" },
  sponsored: { out: "Sponsored", in: "Sponsored by" },
  attended: { out: "Attended", in: "Attended by" },
  divested: { out: "Divested", in: "Divested by" },
  originated: { out: "Originated", in: "Originated by" },
  audits: { out: "Audits", in: "Audited by" },
  values: { out: "Values", in: "Valued by" },
  incubated: { out: "Incubated", in: "Incubated by" },
};

export type PublicFact = {
  id: string;
  occurredOn: string;
  title: string;
  body: string | null;
  channels: string[];
  citation: { sourceName: string | null; url: string | null; documentTitle: string | null } | null;
};

export type PublicConnection = {
  id: string;
  edgeType: EdgeTypeName;
  direction: "out" | "in";
  phrase: string;
  counterpartName: string;
  counterpartHref: string | null;
  role: string | null;
  startedOn: string | null;
};

/**
 * Parsed shape of organizations.enrichment (written by @continuum/pipeline
 * enrich.ts). `overview_en` publishes directly (labeled + sourced); `proposed`
 * awaits review-queue approval; `approved` holds reviewer-accepted fields.
 */
export type OrgEnrichment = {
  overview_en: string;
  strategy_focus: string[];
  source_urls: string[];
  proposed: Record<string, string | number>;
  approved: Record<string, string | number>;
};

export function orgEnrichmentOf(value: unknown): OrgEnrichment | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.overview_en !== "string" || raw.overview_en === "") {
    return null;
  }
  const record = (input: unknown): Record<string, string | number> => {
    if (input === null || typeof input !== "object") {
      return {};
    }
    const out: Record<string, string | number> = {};
    for (const [key, entry] of Object.entries(input as Record<string, unknown>)) {
      if (typeof entry === "string" || typeof entry === "number") {
        out[key] = entry;
      }
    }
    return out;
  };
  return {
    overview_en: raw.overview_en,
    strategy_focus: Array.isArray(raw.strategy_focus)
      ? raw.strategy_focus.filter((tag): tag is string => typeof tag === "string")
      : [],
    source_urls: Array.isArray(raw.source_urls)
      ? raw.source_urls.filter((url): url is string => typeof url === "string")
      : [],
    proposed: record(raw.proposed),
    approved: record(raw.approved),
  };
}

/** Distinct source documents referencing an entity — the provenance section. */
export type PublicMention = {
  url: string | null;
  title: string | null;
  sourceName: string | null;
  date: string | null;
};

export type PublicProfile = {
  entity: EntityRow;
  tags: string[];
  facts: PublicFact[];
  connections: PublicConnection[];
  factsCount: number;
  connectionsCount: number;
  /** Distinct counterpart entities across approved edges. */
  counterpartiesCount: number;
  /** occurred_on of the most recent approved fact. */
  latestActivityOn: string | null;
  /** Facts per capital channel group: distressed / private_credit→credit / pe+vc_founders→equity. */
  factSplit: { equity: number; credit: number; distressed: number };
  mentions: PublicMention[];
  firstSeenYear: number | null;
  /** Raw amount text from extraction, shown verbatim ONLY when deals.amount is unparsed. */
  dealAmountRaw: string | null;
  organization: typeof organizations.$inferSelect | null;
  fund:
    | ((typeof fundVehicles.$inferSelect) & {
        managerName: string | null;
        managerHref: string | null;
      })
    | null;
  deal: typeof deals.$inferSelect | null;
};

/**
 * Full public profile for one entity. Returns null (→ 404) unless the slug
 * exists, is status='active', and matches the kind the route serves — a deal
 * slug requested under /companies must not render.
 */
export async function getPublicProfile(slug: string, kind: PublicKind): Promise<PublicProfile | null> {
  const entityRows = await db.select().from(entities).where(eq(entities.slug, slug));
  const entity = entityRows[0];
  if (!entity || entity.status !== "active" || entity.kind !== kind) {
    return null;
  }

  const tagRows = await db.select().from(entityTags).where(eq(entityTags.entityId, entity.id));

  const factRows = await db
    .select({
      id: timelineFacts.id,
      occurredOn: timelineFacts.occurredOn,
      title: timelineFacts.title,
      body: timelineFacts.body,
      channels: timelineFacts.audienceChannels,
      documentId: timelineFacts.sourceDocumentId,
      documentUrl: documents.url,
      documentTitle: documents.title,
      sourceName: sources.name,
    })
    .from(timelineFacts)
    .leftJoin(documents, eq(documents.id, timelineFacts.sourceDocumentId))
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(and(eq(timelineFacts.entityId, entity.id), eq(timelineFacts.status, "approved")))
    .orderBy(asc(timelineFacts.occurredOn), asc(timelineFacts.recordedAt));

  const facts: PublicFact[] = factRows.map((row) => ({
    id: row.id,
    occurredOn: row.occurredOn,
    title: row.title,
    body: row.body,
    channels: row.channels,
    citation:
      row.documentId === null
        ? null
        : { sourceName: row.sourceName, url: row.documentUrl, documentTitle: row.documentTitle },
  }));

  const edgeRows = await db
    .select()
    .from(edges)
    .where(
      and(
        eq(edges.status, "approved"),
        or(eq(edges.sourceEntityId, entity.id), eq(edges.targetEntityId, entity.id)),
      ),
    );

  const counterpartIds = [
    ...new Set(
      edgeRows.map((row) =>
        row.sourceEntityId === entity.id ? row.targetEntityId : row.sourceEntityId,
      ),
    ),
  ];
  const counterparts =
    counterpartIds.length === 0
      ? []
      : await db
          .select({
            id: entities.id,
            slug: entities.slug,
            kind: entities.kind,
            name: entities.name,
            status: entities.status,
          })
          .from(entities)
          .where(inArray(entities.id, counterpartIds));
  const counterpartById = new Map(counterparts.map((row) => [row.id, row]));

  const connections: PublicConnection[] = edgeRows.map((row) => {
    const direction = row.sourceEntityId === entity.id ? "out" : "in";
    const counterpartId = direction === "out" ? row.targetEntityId : row.sourceEntityId;
    const counterpart = counterpartById.get(counterpartId);
    // Counterparts link through only when active AND publicly routable;
    // anything else renders as plain text.
    const href =
      counterpart !== undefined && counterpart.status === "active"
        ? publicPathFor(counterpart.kind, counterpart.slug)
        : null;
    return {
      id: row.id,
      edgeType: row.edgeType,
      direction,
      phrase: EDGE_PHRASES[row.edgeType][direction],
      counterpartName: counterpart?.name ?? "Unknown entity",
      counterpartHref: href,
      role: row.role,
      startedOn: row.startedOn,
    };
  });

  const firstFact = facts[0];
  const firstSeenYear =
    firstFact !== undefined
      ? Number(firstFact.occurredOn.slice(0, 4))
      : entity.createdAt !== null
        ? entity.createdAt.getFullYear()
        : null;
  const lastFact = facts[facts.length - 1];
  const latestActivityOn = lastFact?.occurredOn ?? null;

  // Channel → capital group; a multi-channel fact counts once per group.
  const factSplit = { equity: 0, credit: 0, distressed: 0 };
  for (const fact of facts) {
    const channels = new Set(fact.channels);
    if (channels.has("distressed")) {
      factSplit.distressed += 1;
    }
    if (channels.has("private_credit")) {
      factSplit.credit += 1;
    }
    if (channels.has("pe") || channels.has("vc_founders")) {
      factSplit.equity += 1;
    }
  }

  const counterpartiesCount = counterpartIds.length;

  const mentionRows = await db
    .select({
      url: documents.url,
      title: documents.title,
      sourceName: sources.name,
      date: sql<string | null>`min(${timelineFacts.occurredOn})`,
    })
    .from(timelineFacts)
    .innerJoin(documents, eq(documents.id, timelineFacts.sourceDocumentId))
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(and(eq(timelineFacts.entityId, entity.id), eq(timelineFacts.status, "approved")))
    .groupBy(documents.id, documents.url, documents.title, sources.name)
    .orderBy(sql`min(${timelineFacts.occurredOn}) desc`);
  const mentions: PublicMention[] = mentionRows.map((row) => ({
    url: row.url,
    title: row.title,
    sourceName: row.sourceName,
    date: row.date === null ? null : String(row.date).slice(0, 10),
  }));

  let organization: PublicProfile["organization"] = null;
  let fund: PublicProfile["fund"] = null;
  let deal: PublicProfile["deal"] = null;
  if (kind === "organization") {
    organization =
      (await db.select().from(organizations).where(eq(organizations.entityId, entity.id)))[0] ??
      null;
  } else if (kind === "fund_vehicle") {
    const fundRow =
      (await db.select().from(fundVehicles).where(eq(fundVehicles.entityId, entity.id)))[0] ?? null;
    if (fundRow !== null) {
      let managerName: string | null = null;
      let managerHref: string | null = null;
      if (fundRow.managerEntityId !== null) {
        const manager = (
          await db
            .select({
              slug: entities.slug,
              kind: entities.kind,
              name: entities.name,
              status: entities.status,
            })
            .from(entities)
            .where(eq(entities.id, fundRow.managerEntityId))
        )[0];
        if (manager !== undefined) {
          managerName = manager.name;
          managerHref =
            manager.status === "active" ? publicPathFor(manager.kind, manager.slug) : null;
        }
      }
      fund = { ...fundRow, managerName, managerHref };
    }
  } else {
    deal = (await db.select().from(deals).where(eq(deals.entityId, entity.id)))[0] ?? null;
  }

  // Monetary display is deterministic: stored numerics only, else the raw
  // extracted text verbatim. Never computed here or by an LLM.
  let dealAmountRaw: string | null = null;
  if (deal !== null && deal.amount === null) {
    const rawRows = await db
      .select({ raw: sql<string | null>`${timelineFacts.data}->>'amountText'` })
      .from(timelineFacts)
      .where(
        and(
          eq(timelineFacts.entityId, entity.id),
          eq(timelineFacts.status, "approved"),
          isNotNull(sql`${timelineFacts.data}->>'amountText'`),
        ),
      )
      .orderBy(asc(timelineFacts.occurredOn))
      .limit(1);
    dealAmountRaw = rawRows[0]?.raw ?? null;
  }

  return {
    entity,
    tags: tagRows.map((row) => row.tag),
    facts,
    connections,
    factsCount: facts.length,
    connectionsCount: connections.length,
    counterpartiesCount,
    latestActivityOn,
    factSplit,
    mentions,
    firstSeenYear,
    dealAmountRaw,
    organization,
    fund,
    deal,
  };
}

export type SimilarEntity = {
  id: string;
  slug: string;
  kind: EntityKind;
  name: string;
  country: string | null;
  tags: string[];
  href: string | null;
};

/**
 * Cosine-nearest active entities: same kind first, then cross-kind fill up to k.
 * Empty when the anchor entity has no embedding (section stays hidden).
 */
export async function getSimilar(entityId: string, k = 5): Promise<SimilarEntity[]> {
  const anchorRows = await db
    .select({ kind: entities.kind, embedding: entities.embedding })
    .from(entities)
    .where(eq(entities.id, entityId));
  const anchor = anchorRows[0];
  if (!anchor || anchor.embedding === null) {
    return [];
  }

  const base = and(
    eq(entities.status, "active"),
    ne(entities.id, entityId),
    isNotNull(entities.embedding),
    inArray(entities.kind, PUBLIC_KINDS),
  );
  const distance = cosineDistance(entities.embedding, anchor.embedding);
  const pick = {
    id: entities.id,
    slug: entities.slug,
    kind: entities.kind,
    name: entities.name,
    country: entities.country,
  };

  const sameKind = await db
    .select(pick)
    .from(entities)
    .where(and(base, eq(entities.kind, anchor.kind)))
    .orderBy(distance)
    .limit(k);

  const hits = [...sameKind];
  if (hits.length < k) {
    const crossKind = await db
      .select(pick)
      .from(entities)
      .where(and(base, ne(entities.kind, anchor.kind)))
      .orderBy(distance)
      .limit(k - hits.length);
    hits.push(...crossKind);
  }
  if (hits.length === 0) {
    return [];
  }

  const tagRows = await db
    .select()
    .from(entityTags)
    .where(
      inArray(
        entityTags.entityId,
        hits.map((row) => row.id),
      ),
    );
  return hits.map((row) => ({
    ...row,
    tags: tagRows
      .filter((tag) => tag.entityId === row.id)
      .map((tag) => tag.tag)
      .slice(0, 3),
    href: publicPathFor(row.kind, row.slug),
  }));
}

/**
 * Related entities with a NEVER-EMPTY guarantee: cosine neighbors when the
 * entity has an embedding, else a deterministic fallback ranked by shared
 * tags, then same city (geo within 200m — geocoded city centroids coincide),
 * then same country, then activity. With ≥k other active public entities in
 * the corpus, this always returns k rows.
 */
export async function getRelated(entityId: string, k = 5): Promise<SimilarEntity[]> {
  const viaEmbeddings = await getSimilar(entityId, k);
  if (viaEmbeddings.length > 0) {
    return viaEmbeddings;
  }
  const result = await db.execute(sql`
    with me as (
      select id, country, geo,
        coalesce((select array_agg(tag) from entity_tags t where t.entity_id = ${entityId}), '{}') as tags
      from entities where id = ${entityId}
    )
    select e.id, e.slug, e.kind, e.name, e.country,
      (select count(*)::int from entity_tags t
        where t.entity_id = e.id and t.tag = any(me.tags)) as shared_tags,
      case when me.geo is not null and e.geo is not null
           and ST_DWithin(e.geo, me.geo, 200) then 1 else 0 end as same_city,
      case when e.country is not null and e.country = me.country then 1 else 0 end as same_country,
      (select count(*)::int from timeline_facts tf
        where tf.entity_id = e.id and tf.status = 'approved') as facts_count
    from entities e, me
    where e.status = 'active' and e.id <> me.id
      and e.kind in ('organization', 'fund_vehicle', 'deal')
    order by shared_tags desc, same_city desc, same_country desc, facts_count desc, e.name
    limit ${k}
  `);
  const hits = result.rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    kind: String(row.kind) as EntityKind,
    name: String(row.name),
    country: row.country === null ? null : String(row.country),
  }));
  if (hits.length === 0) {
    return [];
  }
  const tagRows = await db
    .select()
    .from(entityTags)
    .where(
      inArray(
        entityTags.entityId,
        hits.map((row) => row.id),
      ),
    );
  return hits.map((row) => ({
    ...row,
    tags: tagRows
      .filter((tag) => tag.entityId === row.id)
      .map((tag) => tag.tag)
      .slice(0, 3),
    href: publicPathFor(row.kind, row.slug),
  }));
}

export type PublicSearchHit = {
  id: string;
  slug: string;
  kind: EntityKind;
  name: string;
  country: string | null;
  tags: string[];
  href: string | null;
  match: "text" | "semantic";
};

/**
 * Public search = ILIKE/alias matches first, then (when a query embedding is
 * supplied) the 10 cosine-nearest embedded entities, deduped by id. Only
 * active, publicly routable entities ever surface.
 */
export async function searchPublic(
  query: string,
  queryEmbedding: number[] | null = null,
): Promise<PublicSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }
  const normalized = normalizeAlias(trimmed);

  const textRows = await db
    .selectDistinct({
      id: entities.id,
      slug: entities.slug,
      kind: entities.kind,
      name: entities.name,
      country: entities.country,
    })
    .from(entities)
    .leftJoin(aliases, eq(aliases.entityId, entities.id))
    .where(
      and(
        eq(entities.status, "active"),
        inArray(entities.kind, PUBLIC_KINDS),
        or(
          ilike(entities.name, `%${trimmed}%`),
          like(aliases.aliasNormalized, `%${normalized}%`),
        ),
      ),
    )
    .orderBy(entities.name);

  const hits: PublicSearchHit[] = textRows.map((row) => ({
    ...row,
    tags: [],
    href: publicPathFor(row.kind, row.slug),
    match: "text",
  }));
  const seen = new Set(hits.map((hit) => hit.id));

  if (queryEmbedding !== null) {
    const distance = cosineDistance(entities.embedding, queryEmbedding);
    const semanticRows = await db
      .select({
        id: entities.id,
        slug: entities.slug,
        kind: entities.kind,
        name: entities.name,
        country: entities.country,
      })
      .from(entities)
      .where(
        and(
          eq(entities.status, "active"),
          inArray(entities.kind, PUBLIC_KINDS),
          isNotNull(entities.embedding),
        ),
      )
      .orderBy(distance)
      .limit(10);
    for (const row of semanticRows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        hits.push({
          ...row,
          tags: [],
          href: publicPathFor(row.kind, row.slug),
          match: "semantic",
        });
      }
    }
  }

  if (hits.length > 0) {
    const tagRows = await db
      .select()
      .from(entityTags)
      .where(
        inArray(
          entityTags.entityId,
          hits.map((hit) => hit.id),
        ),
      );
    for (const hit of hits) {
      hit.tags = tagRows.filter((tag) => tag.entityId === hit.id).map((tag) => tag.tag);
    }
  }
  return hits;
}

export const PUBLIC_PAGE_SIZE = 50;

export type PublicListing = {
  rows: {
    id: string;
    slug: string;
    name: string;
    country: string | null;
    summary: string | null;
    tags: string[];
    href: string | null;
  }[];
  total: number;
  page: number;
  pageCount: number;
};

/** Paginated active-entity index for one public kind, with country/tag filters. */
export async function listPublicEntities(
  kind: PublicKind,
  opts: { page?: number; country?: string; tag?: string } = {},
): Promise<PublicListing> {
  const page = Math.max(1, opts.page ?? 1);
  const conditions = [eq(entities.status, "active"), eq(entities.kind, kind)];
  if (opts.country !== undefined && opts.country !== "") {
    conditions.push(eq(entities.country, opts.country));
  }
  if (opts.tag !== undefined && opts.tag !== "") {
    conditions.push(
      sql`exists (select 1 from ${entityTags} where ${entityTags.entityId} = ${entities.id} and ${entityTags.tag} = ${opts.tag})`,
    );
  }
  const where = and(...conditions);

  const totalRows = await db.select({ n: count() }).from(entities).where(where);
  const total = totalRows[0]?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));

  const rows = await db
    .select({
      id: entities.id,
      slug: entities.slug,
      name: entities.name,
      country: entities.country,
      summary: entities.summary,
    })
    .from(entities)
    .where(where)
    .orderBy(asc(entities.name), asc(entities.id))
    .limit(PUBLIC_PAGE_SIZE)
    .offset((page - 1) * PUBLIC_PAGE_SIZE);

  const tagRows =
    rows.length === 0
      ? []
      : await db
          .select()
          .from(entityTags)
          .where(
            inArray(
              entityTags.entityId,
              rows.map((row) => row.id),
            ),
          );

  return {
    rows: rows.map((row) => ({
      ...row,
      tags: tagRows.filter((tag) => tag.entityId === row.id).map((tag) => tag.tag),
      href: publicPathFor(kind, row.slug),
    })),
    total,
    page,
    pageCount,
  };
}

/** Distinct countries and tags in use among active entities of a kind (filter options). */
export async function listPublicFilterOptions(
  kind: PublicKind,
): Promise<{ countries: string[]; tags: string[] }> {
  const countryRows = await db
    .selectDistinct({ country: entities.country })
    .from(entities)
    .where(and(eq(entities.status, "active"), eq(entities.kind, kind), isNotNull(entities.country)))
    .orderBy(asc(entities.country));
  const tagRows = await db
    .selectDistinct({ tag: entityTags.tag })
    .from(entityTags)
    .innerJoin(entities, eq(entities.id, entityTags.entityId))
    .where(and(eq(entities.status, "active"), eq(entities.kind, kind)))
    .orderBy(asc(entityTags.tag));
  return {
    countries: countryRows.map((row) => row.country).filter((c): c is string => c !== null),
    tags: tagRows.map((row) => row.tag),
  };
}

/** How many active entities carry an embedding — gates the semantic leg of /search. */
export async function countEmbeddedEntities(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(entities)
    .where(and(eq(entities.status, "active"), isNotNull(entities.embedding)));
  return rows[0]?.n ?? 0;
}

/** Every active public entity URL path, for the sitemap. */
export async function listPublicUrls(): Promise<
  { path: string; kind: PublicKind; updatedAt: Date | null }[]
> {
  const rows = await db
    .select({
      slug: entities.slug,
      kind: entities.kind,
      updatedAt: entities.updatedAt,
    })
    .from(entities)
    .where(and(eq(entities.status, "active"), inArray(entities.kind, PUBLIC_KINDS)))
    .orderBy(asc(entities.kind), asc(entities.slug));
  return rows.map((row) => ({
    path: publicPathFor(row.kind, row.slug) ?? `/${row.slug}`,
    kind: row.kind as PublicKind,
    updatedAt: row.updatedAt,
  }));
}

/** Active public-entity count per kind — sitemap chunk planning (Phase 23B). */
export async function countPublicByKind(): Promise<Record<PublicKind, number>> {
  const rows = await db
    .select({ kind: entities.kind, n: sql<number>`count(*)::int` })
    .from(entities)
    .where(and(eq(entities.status, "active"), inArray(entities.kind, PUBLIC_KINDS)))
    .groupBy(entities.kind);
  const counts = { organization: 0, fund_vehicle: 0, deal: 0 } as Record<PublicKind, number>;
  for (const row of rows) {
    counts[row.kind as PublicKind] = Number(row.n);
  }
  return counts;
}

/** One stable-ordered page of public URLs for a kind (sitemap chunks). */
export async function listPublicUrlsPage(
  kind: PublicKind,
  offset: number,
  limit: number,
): Promise<{ path: string; updatedAt: Date | null }[]> {
  const rows = await db
    .select({ slug: entities.slug, updatedAt: entities.updatedAt })
    .from(entities)
    .where(and(eq(entities.status, "active"), eq(entities.kind, kind)))
    .orderBy(asc(entities.slug))
    .offset(offset)
    .limit(limit);
  return rows.map((row) => ({
    path: publicPathFor(kind, row.slug) ?? `/${row.slug}`,
    updatedAt: row.updatedAt,
  }));
}

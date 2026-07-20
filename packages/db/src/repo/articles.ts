import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client";
import { articles, entities, organizations, timelineFacts, documents, sources } from "../schema";

/**
 * News Desk article queries (reset build Part 6). Public surfaces show
 * PUBLISHED articles only; the review queue works on proposed ones. The
 * citation footer data is assembled here at render time — never model text.
 */

export type ArticleRow = typeof articles.$inferSelect;

export type ArticleListItem = {
  id: string;
  slug: string;
  headline: string;
  deck: string | null;
  channels: string[];
  byline: string;
  publishedAt: Date | null;
  entityName: string | null;
  entitySlug: string | null;
  entityKind: string | null;
  logoUrl: string | null;
  entityCountry: string | null;
  assetClass: string | null;
  strategy: string | null;
};

const listSelection = {
  id: articles.id,
  slug: articles.slug,
  headline: articles.headline,
  deck: articles.deck,
  channels: articles.channels,
  byline: articles.byline,
  publishedAt: articles.publishedAt,
  entityName: entities.name,
  entitySlug: entities.slug,
  entityKind: sql<string | null>`${entities.kind}::text`,
  logoUrl: organizations.logoUrl,
  entityCountry: entities.country,
  assetClass: articles.assetClass,
  strategy: articles.strategy,
};

export async function listPublishedArticles(limit = 50): Promise<ArticleListItem[]> {
  return db
    .select(listSelection)
    .from(articles)
    .leftJoin(entities, eq(entities.id, articles.primaryEntityId))
    .leftJoin(organizations, eq(organizations.entityId, articles.primaryEntityId))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
}

export type ArticleCitation = {
  factId: string;
  factTitle: string;
  occurredOn: string;
  excerpt: string | null;
  sourceName: string | null;
  documentUrl: string | null;
  documentTitle: string | null;
};

export type ArticleDetail = {
  article: ArticleRow;
  entity: { name: string; slug: string; kind: string; country: string | null; logoUrl: string | null } | null;
  citations: ArticleCitation[];
};

async function citationsFor(article: ArticleRow): Promise<ArticleCitation[]> {
  if (article.factIds.length === 0) {
    return [];
  }
  const rows = await db
    .select({
      factId: timelineFacts.id,
      factTitle: timelineFacts.title,
      occurredOn: timelineFacts.occurredOn,
      data: timelineFacts.data,
      sourceName: sources.name,
      documentUrl: documents.url,
      documentTitle: documents.title,
    })
    .from(timelineFacts)
    .leftJoin(documents, eq(documents.id, timelineFacts.sourceDocumentId))
    .leftJoin(sources, eq(sources.id, documents.sourceId))
    .where(inArray(timelineFacts.id, article.factIds));
  return rows.map((row) => {
    const data = (row.data ?? {}) as Record<string, unknown>;
    const excerpt = typeof data.excerpt_original === "string" ? data.excerpt_original : null;
    return {
      factId: row.factId,
      factTitle: row.factTitle,
      occurredOn: String(row.occurredOn),
      excerpt,
      sourceName: row.sourceName,
      documentUrl: row.documentUrl,
      documentTitle: row.documentTitle,
    };
  });
}

async function detailFor(article: ArticleRow | undefined): Promise<ArticleDetail | null> {
  if (article === undefined) {
    return null;
  }
  let entity: ArticleDetail["entity"] = null;
  if (article.primaryEntityId !== null) {
    const entityRows = await db
      .select({
        name: entities.name,
        slug: entities.slug,
        kind: sql<string>`${entities.kind}::text`,
        country: entities.country,
        logoUrl: organizations.logoUrl,
      })
      .from(entities)
      .leftJoin(organizations, eq(organizations.entityId, entities.id))
      .where(eq(entities.id, article.primaryEntityId));
    entity = entityRows[0] ?? null;
  }
  return { article, entity, citations: await citationsFor(article) };
}

export async function publishedArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const rows = await db.select().from(articles).where(eq(articles.slug, slug));
  const article = rows[0];
  if (article === undefined || article.status !== "published") {
    return null;
  }
  return detailFor(article);
}

export async function articleDetailById(id: string): Promise<ArticleDetail | null> {
  const rows = await db.select().from(articles).where(eq(articles.id, id));
  return detailFor(rows[0]);
}

export async function listArticlesByStatus(
  status: "proposed" | "published" | "rejected",
  limit = 100,
): Promise<ArticleListItem[]> {
  return db
    .select(listSelection)
    .from(articles)
    .leftJoin(entities, eq(entities.id, articles.primaryEntityId))
    .leftJoin(organizations, eq(organizations.entityId, articles.primaryEntityId))
    .where(eq(articles.status, status))
    .orderBy(desc(articles.createdAt))
    .limit(limit);
}

/** Fact ids already covered by a proposed or published article. */
export async function coveredFactIds(): Promise<Set<string>> {
  const rows = await db
    .select({ factIds: articles.factIds })
    .from(articles)
    .where(sql`${articles.status} IN ('proposed', 'published')`);
  const covered = new Set<string>();
  for (const row of rows) {
    for (const id of row.factIds) {
      covered.add(id);
    }
  }
  return covered;
}

/**
 * Operator writing desk (Phase 27C). The desk saves drafts and publishes —
 * the SAME functions back the /admin/write actions and the demonstration
 * script; sanitization happens in the caller (shared sanitizer). Byline
 * stays 'Continuum Desk': one voice, human and machine alike — the reader
 * follows the desk, not a masthead of one.
 */
export async function saveOperatorArticle(input: {
  id?: string;
  headline: string;
  deck: string | null;
  bodyMd: string;
  assetClass: string | null;
  strategy: string | null;
  channels: string[];
  primaryEntityId: string | null;
  sourceUrls: string[];
}): Promise<ArticleRow> {
  if (input.id !== undefined) {
    const rows = await db
      .update(articles)
      .set({
        headline: input.headline,
        deck: input.deck,
        bodyMd: input.bodyMd,
        assetClass: input.assetClass,
        strategy: input.strategy,
        channels: input.channels,
        primaryEntityId: input.primaryEntityId,
        sourceUrls: input.sourceUrls,
      })
      .where(sql`${articles.id} = ${input.id} AND ${articles.status} = 'draft'`)
      .returning();
    if (rows[0] !== undefined) {
      return rows[0];
    }
  }
  const base = input.headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  let slug = base === "" ? "untitled" : base;
  for (let suffix = 2; ; suffix++) {
    const clash = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
    if (clash.length === 0) {
      break;
    }
    slug = `${base}-${suffix}`;
  }
  const rows = await db
    .insert(articles)
    .values({
      slug,
      headline: input.headline,
      deck: input.deck,
      bodyMd: input.bodyMd,
      status: "draft",
      channels: input.channels,
      primaryEntityId: input.primaryEntityId,
      factIds: [],
      sourceDocumentIds: [],
      byline: "Continuum Desk",
      authoredBy: "operator",
      assetClass: input.assetClass,
      strategy: input.strategy,
      sourceUrls: input.sourceUrls,
    })
    .returning();
  return rows[0]!;
}

export async function publishOperatorArticle(id: string): Promise<boolean> {
  const rows = await db
    .update(articles)
    .set({ status: "published", publishedAt: new Date() })
    .where(sql`${articles.id} = ${id} AND ${articles.status} = 'draft' AND ${articles.authoredBy} = 'operator'`)
    .returning({ id: articles.id });
  return rows.length > 0;
}

/** Published article slugs + dates for the sitemap. */
export async function listArticleUrls(): Promise<{ slug: string; publishedAt: Date | null }[]> {
  return db
    .select({ slug: articles.slug, publishedAt: articles.publishedAt })
    .from(articles)
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt));
}

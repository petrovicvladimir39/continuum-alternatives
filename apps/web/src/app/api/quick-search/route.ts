import { NextResponse } from "next/server";
import { articles, db, desc, eq, findEntities, ilike, sql } from "@continuum/db";

export const dynamic = "force-dynamic";

/**
 * ⌘K quick-search endpoint (Phase 25D): entities (existing findEntities
 * resolution corpus) + published articles by headline. Small, capped, no
 * auth required — everything returned is public.
 */

function entityPath(kind: string, slug: string): string | null {
  switch (kind) {
    case "organization":
      return `/companies/${slug}`;
    case "fund_vehicle":
      return `/funds/${slug}`;
    case "deal":
      return `/deals/${slug}`;
    default:
      return null;
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const [entityHits, articleHits] = await Promise.all([
    findEntities(q),
    db
      .select({ slug: articles.slug, headline: articles.headline })
      .from(articles)
      .where(sql`${eq(articles.status, "published")} AND ${ilike(articles.headline, `%${q}%`)}`)
      .orderBy(desc(articles.publishedAt))
      .limit(3),
  ]);

  const hits = [
    ...articleHits.map((article) => ({
      label: article.headline,
      sub: "Article · Continuum Desk",
      href: `/news/${article.slug}`,
    })),
    ...entityHits
      .map((entity) => {
        const href = entityPath(entity.kind, entity.slug);
        return href === null
          ? null
          : {
              label: entity.name,
              sub: `${entity.kind === "organization" ? "Company" : entity.kind === "fund_vehicle" ? "Fund" : "Deal"}${entity.country !== null ? ` · ${entity.country}` : ""}`,
              href,
            };
      })
      .filter((hit): hit is NonNullable<typeof hit> => hit !== null)
      .slice(0, 7),
  ];

  return NextResponse.json({ hits: hits.slice(0, 8) });
}

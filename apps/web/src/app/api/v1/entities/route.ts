import { listPublicEntities, searchPublic, type PublicKind } from "@continuum/db";
import { apiAuth, apiJson, apiError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const KINDS = new Set(["organization", "fund_vehicle", "deal", "event"]);

/**
 * GET /api/v1/entities — the active public record, filtered + paginated.
 * Filters: country (ISO-2), kind, tag, class|strategy (taxonomy slugs),
 * q (name/alias text). Documented in /docs/api; shapes are v1-stable.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await apiAuth(request);
  if (auth instanceof Response) {
    return auth;
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const kind = url.searchParams.get("kind") ?? "organization";
  if (!KINDS.has(kind)) {
    return apiError(400, `kind must be one of: ${[...KINDS].join(", ")}`);
  }

  if (q !== "") {
    const hits = (await searchPublic(q)).filter((hit) => hit.kind === kind);
    return apiJson({
      data: hits.map((hit) => ({
        slug: hit.slug,
        kind: hit.kind,
        name: hit.name,
        country: hit.country,
        tags: hit.tags,
        url: `https://continuumalternatives.com${hit.href ?? ""}`,
      })),
      total: hits.length,
    });
  }

  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const country = url.searchParams.get("country") ?? "";
  const tag = url.searchParams.get("tag") ?? "";
  const strategy = url.searchParams.get("class") ?? url.searchParams.get("strategy") ?? "";
  const listing = await listPublicEntities(kind as PublicKind, { page, country, tag, strategy });
  return apiJson({
    data: listing.rows.map((row) => ({
      slug: row.slug,
      kind,
      name: row.name,
      country: row.country,
      summary: row.summary,
      tags: row.tags,
      url: `https://continuumalternatives.com${row.href ?? ""}`,
    })),
    page: listing.page,
    page_count: listing.pageCount,
    total: listing.total,
  });
}

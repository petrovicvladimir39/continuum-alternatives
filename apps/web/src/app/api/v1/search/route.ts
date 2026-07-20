import { searchPublic } from "@continuum/db";
import { apiAuth, apiError, apiJson } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** GET /api/v1/search?q= — name/alias text search over the active record. */
export async function GET(request: Request): Promise<Response> {
  const auth = await apiAuth(request);
  if (auth instanceof Response) {
    return auth;
  }
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q === "") {
    return apiError(400, "q is required");
  }
  const hits = await searchPublic(q);
  return apiJson({
    data: hits.map((hit) => ({
      slug: hit.slug,
      kind: hit.kind,
      name: hit.name,
      country: hit.country,
      tags: hit.tags,
      match: hit.match,
      url: `https://continuumalternatives.com${hit.href ?? ""}`,
    })),
    total: hits.length,
  });
}

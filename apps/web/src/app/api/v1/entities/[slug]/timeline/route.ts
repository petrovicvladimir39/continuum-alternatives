import { getPublicProfile, type PublicKind } from "@continuum/db";
import { apiAuth, apiError, apiJson } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const KINDS: PublicKind[] = ["organization", "fund_vehicle", "deal", "event"];

/** GET /api/v1/entities/{slug}/timeline — approved, CITED facts. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const auth = await apiAuth(request);
  if (auth instanceof Response) {
    return auth;
  }
  const { slug } = await params;
  let profile = null;
  for (const kind of KINDS) {
    profile = await getPublicProfile(slug, kind);
    if (profile !== null) {
      break;
    }
  }
  if (profile === null) {
    return apiError(404, "No active entity with that slug.");
  }
  return apiJson({
    data: profile.facts.map((fact) => ({
      occurred_on: fact.occurredOn,
      title: fact.title,
      body: fact.body,
      channels: fact.channels,
      // Citations travel with every fact — the record's credibility spine.
      source:
        fact.citation === null
          ? { name: "internal record", url: null }
          : { name: fact.citation.sourceName, url: fact.citation.url },
    })),
    total: profile.facts.length,
  });
}

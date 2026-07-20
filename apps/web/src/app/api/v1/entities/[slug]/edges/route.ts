import { getPublicProfile, type PublicKind } from "@continuum/db";
import { apiAuth, apiError, apiJson } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const KINDS: PublicKind[] = ["organization", "fund_vehicle", "deal", "event"];

/** GET /api/v1/entities/{slug}/edges — approved relationships. */
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
    data: profile.connections.map((connection) => ({
      edge_type: connection.edgeType,
      direction: connection.direction,
      phrase: connection.phrase,
      counterpart: connection.counterpartName,
      counterpart_url:
        connection.counterpartHref === null
          ? null
          : `https://continuumalternatives.com${connection.counterpartHref}`,
      role: connection.role,
      started_on: connection.startedOn,
    })),
    total: profile.connections.length,
  });
}

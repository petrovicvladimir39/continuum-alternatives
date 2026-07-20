import { getPublicProfile, listClassificationsForEntity, type PublicKind } from "@continuum/db";
import { apiAuth, apiError, apiJson } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const KINDS: PublicKind[] = ["organization", "fund_vehicle", "deal", "event"];

/** GET /api/v1/entities/{slug} — profile + classifications + tags. */
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
  const classifications = (await listClassificationsForEntity(profile.entity.id)).filter(
    (row) => row.status === "approved",
  );
  return apiJson({
    data: {
      slug: profile.entity.slug,
      kind: profile.entity.kind,
      name: profile.entity.name,
      country: profile.entity.country,
      summary: profile.entity.summary,
      tags: profile.tags,
      classifications: classifications.map((row) => ({
        asset_class: row.assetClass,
        strategy: row.strategy === "" ? null : row.strategy,
      })),
      website: profile.organization?.website ?? null,
      city: profile.organization?.hqCity ?? null,
      founded_year: profile.organization?.foundedYear ?? null,
      steward_statement: profile.organization?.stewardStatement ?? null,
      stats: {
        facts: profile.factsCount,
        connections: profile.connectionsCount,
        counterparties: profile.counterpartiesCount,
        first_seen_year: profile.firstSeenYear,
        latest_activity_on: profile.latestActivityOn,
      },
    },
  });
}

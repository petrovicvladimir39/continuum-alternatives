import { CHANNELS, assetClassBySlug } from "@continuum/shared";
import { listAskFeed } from "@continuum/db";
import { apiAuth, apiError, apiJson } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/facts — approved facts across the record, newest first.
 * Filters: channel, class (asset-class slug), country, since (YYYY-MM-DD,
 * recorded date), limit ≤200. Every fact carries its source.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await apiAuth(request);
  if (auth instanceof Response) {
    return auth;
  }
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") ?? "";
  if (channel !== "" && !(CHANNELS as readonly string[]).includes(channel)) {
    return apiError(400, `channel must be one of: ${CHANNELS.join(", ")}`);
  }
  const assetClass = url.searchParams.get("class") ?? "";
  if (assetClass !== "" && assetClassBySlug(assetClass) === null) {
    return apiError(400, "unknown asset class slug");
  }
  const since = url.searchParams.get("since") ?? "";
  if (since !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    return apiError(400, "since must be YYYY-MM-DD");
  }
  const sinceMs = since === "" ? null : Date.parse(`${since}T00:00:00Z`);
  const recordedWithinHours =
    sinceMs === null ? undefined : Math.max(1, Math.ceil((Date.now() - sinceMs) / 3_600_000));
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
  const country = url.searchParams.get("country") ?? "";

  const feed = await listAskFeed({
    ...(channel !== "" ? { channels: [channel] } : {}),
    ...(assetClass !== "" ? { assetClasses: [assetClass] } : {}),
    ...(country !== "" ? { countries: [country.toUpperCase()] } : {}),
    ...(recordedWithinHours !== undefined ? { recordedWithinHours } : {}),
    limit,
  });
  return apiJson({
    data: feed.items.map((item) => ({
      occurred_on: item.occurredOn,
      title: item.title,
      fact_type: item.factType,
      channels: item.channels,
      entity: {
        name: item.entityName,
        slug: item.entitySlug,
        country: item.entityCountry,
        url: item.entityHref === null ? null : `https://continuumalternatives.com${item.entityHref}`,
      },
      source: { name: item.sourceName, url: item.sourceUrl },
    })),
    total: feed.total,
    returned: feed.items.length,
  });
}

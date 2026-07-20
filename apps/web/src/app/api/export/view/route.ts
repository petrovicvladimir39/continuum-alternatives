import { parseAsk } from "@continuum/shared";
import { exportViewFactsCsv, listSavedViews, logExport } from "@continuum/db";
import { csvResponse, gateMemberExport } from "@/lib/member-export";

export const dynamic = "force-dynamic";

/**
 * Member CSV export of a saved view (Phase 29B): the member's OWN view only
 * (ownership by list membership — no cross-member id probing), its stored q
 * re-parsed through the same deterministic parser the News front uses.
 */
export async function GET(request: Request): Promise<Response> {
  const gate = await gateMemberExport();
  if (!gate.ok) {
    return gate.response;
  }
  const url = new URL(request.url);
  const viewId = url.searchParams.get("viewId") ?? "";
  const views = await listSavedViews(gate.memberId);
  const view = views.find((row) => row.id === viewId);
  if (view === undefined) {
    return new Response("View not found.", { status: 404 });
  }
  const stored = view.filters as { q?: string };
  const filters = parseAsk(stored.q ?? "");
  if (filters === null) {
    return new Response("This view holds no parseable filters.", { status: 400 });
  }
  const { csv, rows, total } = await exportViewFactsCsv({
    channels: filters.channels,
    countries: filters.countries,
    factTypes: filters.factTypes,
    strategies: filters.strategies,
    assetClasses: filters.assetClasses,
    ...(filters.freeText !== "" ? { entityQuery: filters.freeText } : {}),
  });
  await logExport(gate.memberId, "view", { viewId, q: stored.q ?? "", rows, total });
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = view.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "view";
  return csvResponse(csv, `continuum-view-${safeName}-${stamp}.csv`);
}

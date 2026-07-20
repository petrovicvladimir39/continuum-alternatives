import { exportEntitiesCsv, logExport } from "@continuum/db";
import { csvResponse, gateMemberExport } from "@/lib/member-export";

export const dynamic = "force-dynamic";

const EXPORTABLE_KINDS = new Set(["organization", "fund_vehicle", "deal"]);

/**
 * Member "Export view" on the public data listings (Phase 29B) — the same
 * filters the listing pages accept (kind/country/tag/strategy), active
 * entities only, through the Part-5 export layer. Founding-gated +
 * rate-limited in gateMemberExport.
 */
export async function GET(request: Request): Promise<Response> {
  const gate = await gateMemberExport();
  if (!gate.ok) {
    return gate.response;
  }
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "organization";
  if (!EXPORTABLE_KINDS.has(kind)) {
    return new Response("Unknown kind.", { status: 400 });
  }
  const country = url.searchParams.get("country");
  const tag = url.searchParams.get("tag");
  const strategy = url.searchParams.get("strategy");
  const filter = {
    kind,
    status: "active", // members export the public record, not provisional rows
    ...(country !== null && country !== "" ? { country } : {}),
    ...(tag !== null && tag !== "" ? { tag } : {}),
    ...(strategy !== null && strategy !== "" ? { strategy } : {}),
  };
  const csv = await exportEntitiesCsv(filter);
  await logExport(gate.memberId, "entities", filter);
  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `continuum-${kind}-${stamp}.csv`);
}

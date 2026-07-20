import {
  exportDocumentsCsv,
  exportEdgesCsv,
  exportEntitiesCsv,
  exportFactsCsv,
} from "@continuum/db";

export const dynamic = "force-dynamic";

/**
 * CSV download endpoint for the universe control room — same shared export
 * layer as the pnpm export:* CLI. Admin-only (middleware basic auth).
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "entities";
  const opt = (name: string) => {
    const value = url.searchParams.get(name);
    return value === null || value === "" ? undefined : value;
  };

  let csv: string;
  let filename: string;
  switch (kind) {
    case "edges":
      csv = await exportEdgesCsv();
      filename = "edges.csv";
      break;
    case "facts":
      csv = await exportFactsCsv({
        ...(opt("channel") !== undefined ? { channel: opt("channel")! } : {}),
        ...(opt("since") !== undefined ? { since: opt("since")! } : {}),
      });
      filename = "facts.csv";
      break;
    case "documents":
      csv = await exportDocumentsCsv({
        ...(opt("source") !== undefined ? { source: opt("source")! } : {}),
        ...(opt("since") !== undefined ? { since: opt("since")! } : {}),
      });
      filename = "documents.csv";
      break;
    default:
      csv = await exportEntitiesCsv({
        ...(opt("country") !== undefined ? { country: opt("country")!.toUpperCase() } : {}),
        ...(opt("tag") !== undefined ? { tag: opt("tag")! } : {}),
        ...(opt("kind2") !== undefined ? { kind: opt("kind2")! } : {}),
        ...(opt("status") !== undefined ? { status: opt("status")! } : {}),
      });
      filename = "entities.csv";
  }

  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

import { auth } from "@clerk/nextjs/server";
import { canExport, EXPORTS_PER_DAY } from "@continuum/shared";
import { countExportsToday, getMemberByClerkId, resolveMemberTier } from "@continuum/db";

/**
 * Member CSV export gate (Phase 29B) — shared by /api/export/*. Founding-
 * gated and rate-limited (EXPORTS_PER_DAY, UTC-day window) SERVER-SIDE;
 * every refusal is an honest plain-text sentence, never a silent empty file.
 */

export type ExportGate =
  | { ok: true; memberId: string }
  | { ok: false; response: Response };

function refuse(status: number, message: string): ExportGate {
  return {
    ok: false,
    response: new Response(message, {
      status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  };
}

export async function gateMemberExport(): Promise<ExportGate> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return refuse(404, "Not found");
  }
  const { userId } = await auth();
  if (userId === null) {
    return refuse(401, "Sign in to export.");
  }
  const member = await getMemberByClerkId(userId);
  if (member === null || member.deletedAt !== null) {
    return refuse(401, "Sign in to export.");
  }
  const tier = await resolveMemberTier(member.id);
  if (!canExport(tier)) {
    return refuse(
      403,
      "CSV export is a founding-member feature. See /pricing for what membership includes.",
    );
  }
  const used = await countExportsToday(member.id);
  if (used >= EXPORTS_PER_DAY) {
    return refuse(
      429,
      `Export limit reached — ${EXPORTS_PER_DAY} per day. The counter resets at midnight UTC.`,
    );
  }
  return { ok: true, memberId: member.id };
}

/** UTF-8 BOM + CSV response with a dated filename. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(`﻿${csv}`, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

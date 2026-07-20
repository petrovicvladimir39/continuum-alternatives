"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { canGenerateBrief } from "@continuum/shared";
import { db, entities, eq, getMemberByClerkId, resolveMemberTier } from "@continuum/db";
import { generateEntityBrief } from "@continuum/pipeline";

/**
 * Meeting-prep generation (Phase 31D) — REUSES the Phase 29 brief composer,
 * guards, cache, and the SAME monthly cap (one shared pool: 20 fresh
 * generations/month covers company briefs and prep briefs together —
 * a second budget would just be a second thing to game).
 *
 * PRIVACY LINE, loudly: briefs are about ORGANIZATIONS on the record.
 * Never about members, never about people — person entities are refused
 * here and have no public pages at all.
 */
export async function generatePrepBriefAction(formData: FormData): Promise<void> {
  const eventSlug = String(formData.get("eventSlug") ?? "").trim();
  const entitySlug = String(formData.get("entitySlug") ?? "").trim();
  if (!/^[a-z0-9-]+$/.test(eventSlug) || !/^[a-z0-9-]+$/.test(entitySlug)) {
    redirect("/events");
  }
  const backPath = `/events/${eventSlug}/prep/${entitySlug}`;
  const { userId } = await auth();
  if (userId === null) {
    redirect(backPath);
  }
  const member = await getMemberByClerkId(userId);
  if (member === null || !canGenerateBrief(await resolveMemberTier(member.id))) {
    redirect(backPath);
  }
  const rows = await db
    .select({ id: entities.id, kind: entities.kind, status: entities.status })
    .from(entities)
    .where(eq(entities.slug, entitySlug));
  const entity = rows[0];
  // Organizations, funds, deals — the record. Never person, never event.
  if (
    entity === undefined ||
    entity.status !== "active" ||
    !["organization", "fund_vehicle", "deal"].includes(entity.kind)
  ) {
    redirect(`/events/${eventSlug}/prep`);
  }

  let outcome: string;
  try {
    const result = await generateEntityBrief({ entityId: entity.id, memberId: member.id });
    outcome = result.ok ? "ok" : result.reason;
  } catch {
    outcome = "error";
  }
  redirect(outcome === "ok" ? backPath : `${backPath}?e=${outcome}`);
}

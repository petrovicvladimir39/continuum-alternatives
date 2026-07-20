"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { canGenerateBrief } from "@continuum/shared";
import { db, entities, eq, getMemberByClerkId, resolveMemberTier } from "@continuum/db";
import { generateEntityBrief } from "@continuum/pipeline";

/**
 * "Generate brief" (Phase 29D) — founding-gated server-side; every
 * deterministic gate (cache, member cap, global budget) lives inside
 * generateEntityBrief. Failures land back on the brief page with an honest
 * state code, never a crash.
 */
export async function generateBriefAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim();
  if (slug === "" || !/^[a-z0-9-]+$/.test(slug)) {
    redirect("/companies");
  }
  const { userId } = await auth();
  if (userId === null) {
    redirect(`/companies/${slug}/brief`);
  }
  const member = await getMemberByClerkId(userId);
  if (member === null || !canGenerateBrief(await resolveMemberTier(member.id))) {
    redirect(`/companies/${slug}/brief`);
  }
  const rows = await db
    .select({ id: entities.id, kind: entities.kind, status: entities.status })
    .from(entities)
    .where(eq(entities.slug, slug));
  const entity = rows[0];
  if (entity === undefined || entity.kind !== "organization" || entity.status !== "active") {
    redirect("/companies");
  }

  let outcome: string;
  try {
    const result = await generateEntityBrief({ entityId: entity.id, memberId: member.id });
    outcome = result.ok ? "ok" : result.reason;
  } catch {
    outcome = "error";
  }
  redirect(outcome === "ok" ? `/companies/${slug}/brief` : `/companies/${slug}/brief?e=${outcome}`);
}

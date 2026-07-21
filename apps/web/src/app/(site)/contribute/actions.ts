"use server";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sanitizeArticleMarkdown } from "@continuum/shared";

import { isPostingBanned } from "@continuum/shared";
import {
  createScoutSubmission,
  db,
  entities,
  getMemberByClerkId,
  inArray,
  tryConsumeDailyUsage,
  upsertMemberProfile,
} from "@continuum/db";

import { SCOUT_FACT_TYPES, SCOUTS_PER_DAY } from "@/lib/scout-config";

/**
 * Scout submission action (Phase 34E) — signed-in, sanitized, source URL
 * required, 5/day. Everything lands PENDING; only operator approval
 * publishes (as an approved fact with a document row for the source).
 * NO rewards/points v1 — incentives come after volume exists, if ever.
 */
export async function submitScoutAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (userId === null) {
    redirect("/sign-in");
  }
  let member = await getMemberByClerkId(userId);
  if (member === null) {
    const user = await currentUser();
    member = await upsertMemberProfile({
      clerkUserId: userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      displayName: user?.firstName ?? null,
    });
  }
  // Posting bans (30D) cover contributions too — same speech surface.
  const banned = isPostingBanned(member.bannedUntil);

  const factType = String(formData.get("factType") ?? "");
  const occurredOn = String(formData.get("occurredOn") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const entitiesFree = String(formData.get("entitiesFree") ?? "").trim().slice(0, 300);
  const note = sanitizeArticleMarkdown(String(formData.get("note") ?? "")).slice(0, 1000);
  const anonymous = String(formData.get("anonymous") ?? "") === "1";
  const entityIds = formData
    .getAll("entityIds")
    .map(String)
    .filter((id) => /^[0-9a-f-]{36}$/.test(id))
    .slice(0, 5);

  const fail = (code: string): never => redirect(`/contribute?error=${code}`);
  if (banned) {
    fail("banned");
  }
  if (!(SCOUT_FACT_TYPES as readonly string[]).includes(factType)) {
    fail("type");
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || occurredOn > today || occurredOn < "2000-01-01") {
    fail("date");
  }
  if (!/^https?:\/\/.+\..+/.test(sourceUrl) || sourceUrl.length > 500) {
    fail("url"); // the source URL is REQUIRED — no source, no signal
  }
  if (entityIds.length === 0 && entitiesFree === "") {
    fail("entities");
  }
  // Picked entities must exist and be active.
  if (entityIds.length > 0) {
    const rows = await db
      .select({ id: entities.id })
      .from(entities)
      .where(inArray(entities.id, entityIds));
    if (rows.length !== entityIds.length) {
      fail("entities");
    }
  }
  if (!(await tryConsumeDailyUsage(member.id, "scout", SCOUTS_PER_DAY))) {
    fail("limit");
  }

  await createScoutSubmission({
    memberId: member.id,
    factType,
    entityIds,
    entitiesFree: entitiesFree === "" ? null : entitiesFree,
    occurredOn,
    sourceUrl,
    note: note === "" ? null : note,
    anonymous,
  });
  redirect("/contribute?submitted=1");
}

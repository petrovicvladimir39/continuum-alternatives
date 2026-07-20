"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { parseConnectionsCsv, sanitizeArticleMarkdown } from "@continuum/shared";
import {
  CONTACT_REQUESTS_PER_DAY,
  contactRequestsToday,
  createContactRequest,
  db,
  deleteAllPrivateEdges,
  entities,
  eq,
  findIntroIntermediary,
  getMemberByClerkId,
  importPrivateEdges,
  setMemberAffiliation,
  upsertMemberProfile,
  type MemberProfileRow,
} from "@continuum/db";

/**
 * Universe actions (Phase 32).
 *
 * PRIVACY LAW: every write here is scoped to the SESSION member. Private
 * edges never cross members; no auto-affiliation; no email/phone from
 * uploads is ever stored (dropped at parse). Delete-all is total and
 * immediate.
 */

async function requireMember(): Promise<MemberProfileRow | null> {
  const { userId } = await auth();
  if (userId === null) {
    return null;
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
  return member.deletedAt === null ? member : null;
}

/** "This is my firm" — member-confirmed, changeable, never inferred. */
export async function setAffiliationAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const entityId = String(formData.get("entityId") ?? "").trim();
  if (member === null || entityId === "") {
    return;
  }
  const rows = await db
    .select({ kind: entities.kind, status: entities.status })
    .from(entities)
    .where(eq(entities.id, entityId));
  if (rows[0]?.kind !== "organization" || rows[0]?.status !== "active") {
    return;
  }
  await setMemberAffiliation(member.id, entityId);
  revalidatePath("/account");
  revalidatePath("/universe");
}

export async function clearAffiliationAction(): Promise<void> {
  const member = await requireMember();
  if (member === null) {
    return;
  }
  await setMemberAffiliation(member.id, null);
  revalidatePath("/account");
  revalidatePath("/universe");
}

/**
 * LinkedIn Connections.csv import. The CONSENT checkbox is part of the
 * form and re-checked here — nothing parses without it. Emails in the
 * export are dropped at parse time (see @continuum/shared linkedin.ts).
 */
export async function importLinkedInAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  if (member === null) {
    return;
  }
  if (String(formData.get("consent") ?? "") !== "on") {
    redirect("/account?import=consent");
  }
  const file = formData.get("connections");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/account?import=nofile");
  }
  if (file.size > 5 * 1024 * 1024) {
    redirect("/account?import=toolarge");
  }
  const text = await file.text();
  const parsed = parseConnectionsCsv(text);
  if ("error" in parsed) {
    redirect("/account?import=unparseable");
  }
  const report = await importPrivateEdges(member.id, parsed.connections);
  revalidatePath("/account");
  redirect(
    `/account?import=ok&n=${report.imported}&m=${report.matched}&d=${report.duplicates}${report.capped ? "&capped=1" : ""}`,
  );
}

/** The one-click promise, honored immediately. */
export async function deleteContactsAction(): Promise<void> {
  const member = await requireMember();
  if (member === null) {
    return;
  }
  await deleteAllPrivateEdges(member.id);
  revalidatePath("/account");
  revalidatePath("/universe");
}

/**
 * Intro request (Phase 32D): eligibility re-checked SERVER-SIDE — the
 * intermediary must be confirmed-affiliated to the org and carry a
 * participation signal; rate limit SHARED with 31C event requests. The
 * request references public facts only: it never mentions, implies, or
 * requires any private edge of the requester.
 */
export async function sendIntroRequestAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const viaOrgEntityId = String(formData.get("viaOrgEntityId") ?? "").trim();
  const targetEntityId = String(formData.get("targetEntityId") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "");
  const rawNote = String(formData.get("note") ?? "").trim();
  if (member === null || viaOrgEntityId === "" || targetEntityId === "") {
    return;
  }
  const intermediary = await findIntroIntermediary(viaOrgEntityId, member.id);
  if (intermediary === null) {
    return;
  }
  if ((await contactRequestsToday(member.id)) >= CONTACT_REQUESTS_PER_DAY) {
    redirect(`${backPath.startsWith("/") ? backPath : "/universe"}${backPath.includes("?") ? "&" : "?"}cr=limit`);
  }
  const note = rawNote === "" ? null : sanitizeArticleMarkdown(rawNote).slice(0, 280);
  await createContactRequest({
    fromMemberId: member.id,
    toMemberId: intermediary.memberId,
    contextKind: "universe",
    introTargetEntityId: targetEntityId,
    message: note,
  });
  if (backPath.startsWith("/")) {
    revalidatePath("/universe");
  }
}

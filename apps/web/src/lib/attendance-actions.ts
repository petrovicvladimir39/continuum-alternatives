"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sanitizeArticleMarkdown } from "@continuum/shared";
import {
  CONTACT_REQUESTS_PER_DAY,
  contactRequestsToday,
  createContactRequest,
  db,
  entities,
  eq,
  getMemberByClerkId,
  isVisibleAttendee,
  respondContactRequest,
  setAttendance,
  setAttendanceVisibility,
  upsertMemberProfile,
  type AttendanceStatus,
  type MemberProfileRow,
} from "@continuum/db";

/**
 * Attendance + contact actions (Phase 31C). CONSENT-FIRST, enforced here:
 * visibility is opt-in only the member flips; contact runs visible→visible
 * only; one request per pair per event; 5/day; declines are silent.
 * Attendance is first-party member data ONLY — nothing is ever imported.
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

async function eventExists(eventEntityId: string): Promise<boolean> {
  const rows = await db
    .select({ kind: entities.kind, status: entities.status })
    .from(entities)
    .where(eq(entities.id, eventEntityId));
  return rows[0]?.kind === "event" && rows[0]?.status === "active";
}

function safeRevalidate(backPath: string): void {
  if (backPath.startsWith("/")) {
    revalidatePath(backPath);
  }
}

export async function setAttendanceAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const eventEntityId = String(formData.get("eventEntityId") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const backPath = String(formData.get("backPath") ?? "");
  if (
    member === null ||
    eventEntityId === "" ||
    !["attending", "interested", ""].includes(status) ||
    !(await eventExists(eventEntityId))
  ) {
    return;
  }
  await setAttendance(member.id, eventEntityId, status === "" ? null : (status as AttendanceStatus));
  safeRevalidate(backPath);
}

export async function setVisibilityAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const eventEntityId = String(formData.get("eventEntityId") ?? "").trim();
  const visible = String(formData.get("visible") ?? "") === "1";
  const backPath = String(formData.get("backPath") ?? "");
  if (member === null || eventEntityId === "") {
    return;
  }
  await setAttendanceVisibility(member.id, eventEntityId, visible);
  safeRevalidate(backPath);
}

export async function sendContactRequestAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const toMemberId = String(formData.get("toMemberId") ?? "").trim();
  const eventEntityId = String(formData.get("eventEntityId") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "");
  const rawMessage = String(formData.get("message") ?? "").trim();
  if (member === null || toMemberId === "" || eventEntityId === "" || toMemberId === member.id) {
    return;
  }
  // Visible→visible ONLY, both re-checked server-side.
  const [senderVisible, targetVisible] = await Promise.all([
    isVisibleAttendee(member.id, eventEntityId),
    isVisibleAttendee(toMemberId, eventEntityId),
  ]);
  if (!senderVisible || !targetVisible) {
    return;
  }
  if ((await contactRequestsToday(member.id)) >= CONTACT_REQUESTS_PER_DAY) {
    redirect(`${backPath.startsWith("/") ? backPath : "/events"}?cr=limit`);
  }
  const message = rawMessage === "" ? null : sanitizeArticleMarkdown(rawMessage).slice(0, 280);
  await createContactRequest({
    fromMemberId: member.id,
    toMemberId,
    eventEntityId,
    message,
  });
  safeRevalidate(backPath);
}

/** Recipient-only. Declines notify nobody — silent by design. */
export async function respondContactAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  if (member === null || requestId === "" || !["accept", "decline"].includes(decision)) {
    return;
  }
  await respondContactRequest(requestId, member.id, decision === "accept");
  revalidatePath("/account/updates");
}

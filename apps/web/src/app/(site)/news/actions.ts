"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { parseAsk } from "@continuum/shared";
import {
  createSavedView,
  deleteSavedView,
  getMemberByClerkId,
  upsertMemberProfile,
} from "@continuum/db";

/**
 * Saved-view actions (Phase 25D). Signed-in only — identity comes from the
 * Clerk session; member scoping happens in the repo layer.
 */

async function requireMemberId(): Promise<string | null> {
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
  return member.id;
}

export async function saveAskViewAction(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  if (memberId === null) {
    return;
  }
  const q = String(formData.get("q") ?? "").trim();
  const filters = parseAsk(q);
  if (q === "" || filters === null) {
    return;
  }
  const name =
    String(formData.get("name") ?? "").trim() ||
    filters.matches.map((m) => m.label).join(" · ") ||
    q.slice(0, 60);
  await createSavedView(memberId, name, { q, ...filters });
  revalidatePath("/news");
  revalidatePath("/account");
}

export async function deleteSavedViewAction(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  if (memberId === null) {
    return;
  }
  const viewId = String(formData.get("viewId") ?? "");
  if (viewId !== "") {
    await deleteSavedView(memberId, viewId);
  }
  revalidatePath("/news");
  revalidatePath("/account");
}

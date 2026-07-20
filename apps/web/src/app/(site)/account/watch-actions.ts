"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getMemberByClerkId,
  isWatching,
  setAlertFrequency,
  setSavedViewAlert,
  unwatchEntity,
  upsertMemberProfile,
  watchEntity,
  type AlertFrequency,
} from "@continuum/db";

/**
 * Watchlist actions (Phase 28D). Member identity always re-derived from the
 * Clerk session; server action + refresh, no optimistic UI (house style).
 * Everything here is member-FREE — the paid line (next phase) sits at bulk
 * data access, not at watching.
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

export async function toggleWatchAction(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "").trim();
  if (memberId === null || entityId === "") {
    return;
  }
  if (await isWatching(memberId, entityId)) {
    await unwatchEntity(memberId, entityId);
  } else {
    await watchEntity(memberId, entityId);
  }
  if (backPath.startsWith("/")) {
    revalidatePath(backPath);
  }
  revalidatePath("/account/watchlist");
}

export async function unwatchAction(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  const entityId = String(formData.get("entityId") ?? "").trim();
  if (memberId === null || entityId === "") {
    return;
  }
  await unwatchEntity(memberId, entityId);
  revalidatePath("/account/watchlist");
}

export async function setFrequencyAction(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  const frequency = String(formData.get("frequency") ?? "");
  if (
    memberId === null ||
    !["daily", "instant_important", "off"].includes(frequency)
  ) {
    return;
  }
  await setAlertFrequency(memberId, frequency as AlertFrequency);
  revalidatePath("/account/watchlist");
}

export async function toggleViewAlertAction(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  const viewId = String(formData.get("viewId") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (memberId === null || viewId === "") {
    return;
  }
  await setSavedViewAlert(memberId, viewId, enabled);
  revalidatePath("/account/watchlist");
}

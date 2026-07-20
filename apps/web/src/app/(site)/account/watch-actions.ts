"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { canAddWatch, canEnableViewAlert, canUseFrequency } from "@continuum/shared";
import {
  countAlertEnabledViews,
  countWatchedEntities,
  getMemberByClerkId,
  isWatching,
  resolveMemberTier,
  setAlertFrequency,
  setSavedViewAlert,
  unwatchEntity,
  upsertMemberProfile,
  watchEntity,
  type AlertFrequency,
} from "@continuum/db";

/**
 * Watchlist actions (Phase 28D; entitlements Phase 29B). Member identity
 * always re-derived from the Clerk session; server action + refresh, no
 * optimistic UI (house style).
 *
 * The free/paid line is enforced HERE (server), read from the ONE
 * entitlement module in @continuum/shared. Limits gate ADDING only:
 * a member who downgrades with more watches/alert views than the free tier
 * allows keeps every row — over-limit lists go READ-ONLY (cannot add more),
 * they are never trimmed or deleted. Unwatch/disable always work.
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
    // Free tier: 5 watched entities. The gate is on ADDING only.
    const tier = await resolveMemberTier(memberId);
    const current = await countWatchedEntities(memberId);
    if (!canAddWatch(tier, current)) {
      return;
    }
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
  // instant_important is a founding entitlement; free selects daily/off.
  if (!canUseFrequency(await resolveMemberTier(memberId), frequency)) {
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
  // Free tier: 1 alert-ENABLED view. Disabling is always allowed.
  if (enabled) {
    const tier = await resolveMemberTier(memberId);
    const current = await countAlertEnabledViews(memberId);
    if (!canEnableViewAlert(tier, current)) {
      return;
    }
  }
  await setSavedViewAlert(memberId, viewId, enabled);
  revalidatePath("/account/watchlist");
}

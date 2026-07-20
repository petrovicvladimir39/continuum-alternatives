"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CHANNELS } from "@continuum/shared";
import { updateContactChannels, updateMemberDisplayName } from "@continuum/db";

/**
 * /account server actions (Phase 24D). Every action re-derives the caller's
 * identity from the Clerk session — nothing trusts client-posted ids.
 */

export async function updateDisplayNameAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (userId === null) {
    return;
  }
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName === "" || displayName.length > 120) {
    return;
  }
  await updateMemberDisplayName(userId, displayName);
  revalidatePath("/account");
}

export async function updateNewsletterChannelsAction(formData: FormData): Promise<void> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (email === undefined) {
    return;
  }
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((c) => (CHANNELS as readonly string[]).includes(c));
  // The contact row is looked up by the SESSION email — a member can only
  // ever edit the subscription attached to their own verified address.
  await updateContactChannels(email, channels);
  revalidatePath("/account");
}

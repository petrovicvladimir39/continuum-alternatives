"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getMemberByClerkId, resolveMemberTier, setWatchdogOptIn } from "@continuum/db";

/**
 * Watchdog opt-in toggle (Phase 34E) — founding-gated server-side; the
 * weekly brief NEVER sends to anyone who didn't flip this on themselves.
 */
export async function toggleWatchdogAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (userId === null) {
    return;
  }
  const member = await getMemberByClerkId(userId);
  if (member === null) {
    return;
  }
  const enable = String(formData.get("enable") ?? "") === "1";
  if (enable && (await resolveMemberTier(member.id)) !== "founding") {
    return; // the quiet inline note handles the messaging
  }
  await setWatchdogOptIn(member.id, enable);
  revalidatePath("/account/watchlist");
}

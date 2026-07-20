"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { canAccessAdmin, isPostingBanned, resolveAccessRole } from "@continuum/shared";
import { db, eq, memberProfiles, setMemberBan, setPostStatus } from "@continuum/db";

/**
 * Moderation actions (Phase 30D). The admin layout gates the PAGE; these
 * re-check the role themselves — server actions are network endpoints, not
 * page fragments.
 */

async function requireAdmin(): Promise<boolean> {
  const user = await currentUser();
  const role = resolveAccessRole(
    user === null ? null : { userId: user.id, publicMetadata: user.publicMetadata },
  );
  return canAccessAdmin(role);
}

export async function removePostAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) {
    return;
  }
  const postId = String(formData.get("postId") ?? "").trim();
  if (postId !== "") {
    // Removal keeps the row — the thread shows a "Removed by moderators"
    // stub; member data is never deleted by moderation.
    await setPostStatus(postId, "removed");
  }
  revalidatePath("/admin/moderation");
}

export async function restorePostAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) {
    return;
  }
  const postId = String(formData.get("postId") ?? "").trim();
  if (postId !== "") {
    await setPostStatus(postId, "published");
  }
  revalidatePath("/admin/moderation");
}

/**
 * Posting-ban TOGGLE: banned → cleared; not banned → 30 days from now.
 * A fixed, visible term rather than "indefinite" — indefinite bans rot;
 * repeat offenses are a re-toggle, which is a deliberate human decision.
 */
export async function toggleBanAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) {
    return;
  }
  const memberId = String(formData.get("memberId") ?? "").trim();
  if (memberId === "") {
    return;
  }
  const rows = await db
    .select({ bannedUntil: memberProfiles.bannedUntil })
    .from(memberProfiles)
    .where(eq(memberProfiles.id, memberId));
  const current = rows[0]?.bannedUntil ?? null;
  if (isPostingBanned(current)) {
    await setMemberBan(memberId, null);
  } else {
    await setMemberBan(memberId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  }
  revalidatePath("/admin/moderation");
}

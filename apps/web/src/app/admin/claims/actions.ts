"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { canAccessAdmin, resolveAccessRole } from "@continuum/shared";
import { decideClaim, decideStory } from "@continuum/db";

async function requireAdmin(): Promise<boolean> {
  const user = await currentUser();
  const role = resolveAccessRole(
    user === null ? null : { userId: user.id, publicMetadata: user.publicMetadata },
  );
  return canAccessAdmin(role);
}

export async function decideClaimAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) {
    return;
  }
  const claimId = String(formData.get("claimId") ?? "").trim();
  const approve = String(formData.get("decision") ?? "") === "approve";
  if (claimId !== "") {
    await decideClaim(claimId, approve);
  }
  revalidatePath("/admin/claims");
}

/** Operator gate for vendor stories (33B) — the second consent gate. */
export async function decideStoryAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) {
    return;
  }
  const storyId = String(formData.get("storyId") ?? "").trim();
  const publish = String(formData.get("decision") ?? "") === "publish";
  if (storyId !== "") {
    await decideStory(storyId, publish);
  }
  revalidatePath("/admin/review");
}

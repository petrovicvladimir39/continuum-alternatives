"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { canAccessAdmin, resolveAccessRole } from "@continuum/shared";
import {
  approveScoutSubmission,
  decideClaim,
  decideStory,
  rejectScoutSubmission,
} from "@continuum/db";

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

/**
 * Scout decisions (34E). Approval INSERTS the fact (append-only record) +
 * a document row for the member's source URL; the operator writes the
 * fact title — member text never becomes a fact title unedited.
 */
export async function decideScoutAction(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) {
    return;
  }
  const scoutId = String(formData.get("scoutId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (scoutId === "") {
    return;
  }
  if (decision === "approve" && title !== "") {
    await approveScoutSubmission(scoutId, title);
  } else if (decision === "reject") {
    await rejectScoutSubmission(scoutId);
  }
  revalidatePath("/admin/review");
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

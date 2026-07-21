"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getMemberByClerkId, resolveMemberTier, upsertMemberProfile } from "@continuum/db";
import { askFiling } from "@continuum/pipeline";

export type FilingChatState =
  | { status: "idle" }
  | { status: "done" }
  | { status: "notice"; message: string };

/**
 * Ask-the-filing action (34C). Identity + tier resolved server-side; every
 * cap lives in the pipeline function — this is a thin authenticated shell.
 */
export async function askFilingAction(
  _prev: FilingChatState,
  formData: FormData,
): Promise<FilingChatState> {
  const { userId } = await auth();
  if (userId === null) {
    return { status: "notice", message: "Sign in to ask." };
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
  const documentId = String(formData.get("documentId") ?? "").trim();
  const question = String(formData.get("question") ?? "");
  if (documentId === "") {
    return { status: "notice", message: "No document." };
  }
  const tier = await resolveMemberTier(member.id);
  const result = await askFiling({
    documentId,
    question,
    memberId: member.id,
    founding: tier === "founding",
  });
  revalidatePath(`/documents/${documentId}`);
  if (result.status === "answered") {
    return { status: "done" };
  }
  return { status: "notice", message: result.message };
}

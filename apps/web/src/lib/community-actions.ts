"use server";

import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  isPostingBanned,
  POSTS_PER_MEMBER_PER_DAY,
  validatePostBody,
} from "@continuum/shared";
import {
  countPostsToday,
  createThreadPost,
  db,
  enqueuePostAlerts,
  eq,
  getMemberByClerkId,
  entities,
  memberProfiles,
  reportPost,
  toggleReaction,
  upsertMemberProfile,
  articles,
  REACTIONS,
  type AnchorKind,
  type Reaction,
  type ReactionTargetKind,
  type MemberProfileRow,
} from "@continuum/db";

/**
 * Community actions (Phase 30) — reactions, posts, reports. Member-gated
 * (sign-in), NOT founding-gated: participation wants breadth; the paid line
 * stays at bulk data, exports, and briefs. Every rule here is enforced
 * SERVER-SIDE — the UI's inline hints are courtesy, not the gate.
 */

export type PostState =
  | { status: "idle" }
  | { status: "posted" }
  | { status: "error"; message: string };

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

function safeRevalidate(backPath: string): void {
  if (backPath.startsWith("/")) {
    revalidatePath(backPath);
  }
}

export async function toggleReactionAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const targetKind = String(formData.get("targetKind") ?? "");
  const targetId = String(formData.get("targetId") ?? "").trim();
  const reaction = String(formData.get("reaction") ?? "");
  const backPath = String(formData.get("backPath") ?? "");
  if (
    member === null ||
    !["fact", "article"].includes(targetKind) ||
    targetId === "" ||
    !(REACTIONS as readonly string[]).includes(reaction)
  ) {
    return;
  }
  await toggleReaction(
    member.id,
    targetKind as ReactionTargetKind,
    targetId,
    reaction as Reaction,
  );
  safeRevalidate(backPath);
}

export async function createPostAction(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const member = await requireMember();
  if (member === null) {
    return { status: "error", message: "Sign in to post." };
  }
  // Posting ban (30D) — enforced here, surfaced only as this quiet line.
  if (isPostingBanned(member.bannedUntil)) {
    return { status: "error", message: "Posting from this account is currently suspended." };
  }
  const anchorKind = String(formData.get("anchorKind") ?? "");
  const anchorId = String(formData.get("anchorId") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "");
  if (!["entity", "article", "event"].includes(anchorKind) || anchorId === "") {
    return { status: "error", message: "Nothing to attach this post to." };
  }
  // Anchors must exist and be public — no free-floating posts, ever.
  if (anchorKind === "entity" || anchorKind === "event") {
    const rows = await db
      .select({ status: entities.status })
      .from(entities)
      .where(eq(entities.id, anchorId));
    if (rows[0]?.status !== "active") {
      return { status: "error", message: "Nothing to attach this post to." };
    }
  } else {
    const rows = await db
      .select({ status: articles.status })
      .from(articles)
      .where(eq(articles.id, anchorId));
    if (rows[0]?.status !== "published") {
      return { status: "error", message: "Nothing to attach this post to." };
    }
  }

  const verdict = validatePostBody(String(formData.get("body") ?? ""));
  if (!verdict.ok) {
    const messages = {
      too_short: "Posts need at least 20 characters of substance.",
      too_long: "Posts are capped at 2,000 characters.",
      too_many_links: "Up to 2 links per post.",
    } as const;
    return { status: "error", message: messages[verdict.reason] };
  }
  const postedToday = await countPostsToday(member.id);
  if (postedToday >= POSTS_PER_MEMBER_PER_DAY) {
    return {
      status: "error",
      message: `${POSTS_PER_MEMBER_PER_DAY} posts per day — the limit resets at midnight UTC.`,
    };
  }

  const { id } = await createThreadPost({
    memberId: member.id,
    anchorKind: anchorKind as AnchorKind,
    anchorId,
    body: verdict.body,
  });
  // Watchers of the entity hear about it via the existing outbox (daily batch).
  if (anchorKind === "entity") {
    await enqueuePostAlerts(id, anchorId, member.id);
  }
  safeRevalidate(backPath);
  return { status: "posted" };
}

export async function reportPostAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const postId = String(formData.get("postId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "");
  if (member === null || postId === "") {
    return;
  }
  await reportPost(postId, member.id, reason === "" ? null : reason.slice(0, 300));
  safeRevalidate(backPath);
}

export async function updateProfessionalLineAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  if (member === null) {
    return;
  }
  const roleTitle = String(formData.get("roleTitle") ?? "").trim().slice(0, 80);
  const organization = String(formData.get("organization") ?? "").trim().slice(0, 120);
  await db
    .update(memberProfiles)
    .set({
      roleTitle: roleTitle === "" ? null : roleTitle,
      organization: organization === "" ? null : organization,
    })
    .where(eq(memberProfiles.id, member.id));
  revalidatePath("/account");
}

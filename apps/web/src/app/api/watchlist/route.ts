import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getMemberByClerkId,
  isWatching,
  unwatchEntity,
  upsertMemberProfile,
  watchEntity,
} from "@continuum/db";

export const dynamic = "force-dynamic";

/**
 * Watch toggle for client surfaces (the in-map entity card, Phase 28D).
 * 401 signed-out (the card renders its quiet "Sign in to watch" link);
 * 503 when Clerk is unconfigured.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.json({ error: "identity not configured" }, { status: 503 });
  }
  const { userId } = await auth();
  if (userId === null) {
    return NextResponse.json({ error: "sign in" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { entityId?: string };
  const entityId = body.entityId?.trim() ?? "";
  if (entityId === "") {
    return NextResponse.json({ error: "entityId required" }, { status: 400 });
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
  if (await isWatching(member.id, entityId)) {
    await unwatchEntity(member.id, entityId);
    return NextResponse.json({ watching: false });
  }
  await watchEntity(member.id, entityId);
  return NextResponse.json({ watching: true });
}

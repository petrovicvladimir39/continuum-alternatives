import { eq, sql } from "drizzle-orm";
import { db } from "../client";
import { contacts, memberProfiles } from "../schema";

/**
 * Member profile sync (Phase 24C). Idempotent upserts keyed on
 * clerk_user_id; deletion is SOFT (deleted_at) and cascades into nothing —
 * members own no graph rows.
 */

export type MemberProfileRow = typeof memberProfiles.$inferSelect;

export async function upsertMemberProfile(input: {
  clerkUserId: string;
  displayName?: string | null;
  email?: string | null;
}): Promise<MemberProfileRow> {
  const rows = await db
    .insert(memberProfiles)
    .values({
      clerkUserId: input.clerkUserId,
      displayName: input.displayName ?? null,
      email: input.email?.toLowerCase() ?? null,
    })
    .onConflictDoUpdate({
      target: memberProfiles.clerkUserId,
      set: {
        // Re-created or re-synced users come back to life; never resurrect
        // fields with nulls from a sparse webhook payload.
        displayName: sql`coalesce(${input.displayName ?? null}, ${memberProfiles.displayName})`,
        email: sql`coalesce(${input.email?.toLowerCase() ?? null}, ${memberProfiles.email})`,
        deletedAt: sql`NULL`,
      },
    })
    .returning();
  return rows[0]!;
}

/** user.deleted → soft delete only. No cascade — deliberately nothing else. */
export async function softDeleteMemberProfile(clerkUserId: string): Promise<boolean> {
  const rows = await db
    .update(memberProfiles)
    .set({ deletedAt: new Date() })
    .where(eq(memberProfiles.clerkUserId, clerkUserId))
    .returning({ id: memberProfiles.id });
  return rows.length > 0;
}

export async function getMemberByClerkId(clerkUserId: string): Promise<MemberProfileRow | null> {
  const rows = await db
    .select()
    .from(memberProfiles)
    .where(eq(memberProfiles.clerkUserId, clerkUserId));
  return rows[0] ?? null;
}

export async function updateMemberDisplayName(
  clerkUserId: string,
  displayName: string,
): Promise<void> {
  await db
    .update(memberProfiles)
    .set({ displayName })
    .where(eq(memberProfiles.clerkUserId, clerkUserId));
}

/** Newsletter linking (Phase 24D): a member and a contact join on lowercase email. */
export async function findContactByEmail(
  email: string,
): Promise<typeof contacts.$inferSelect | null> {
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, email.trim().toLowerCase()));
  return rows[0] ?? null;
}

export async function updateContactChannels(email: string, channels: string[]): Promise<void> {
  await db
    .update(contacts)
    .set({ channels })
    .where(eq(contacts.email, email.trim().toLowerCase()));
}

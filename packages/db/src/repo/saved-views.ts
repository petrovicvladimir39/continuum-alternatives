import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { memberSavedViews } from "../schema";

/**
 * Saved-view CRUD (Phase 25D). Authorization is app-layer: every function
 * takes the MEMBER id the caller resolved from their own Clerk session —
 * rows are always scoped to it, so no cross-member access is expressible.
 */

export type SavedViewRow = typeof memberSavedViews.$inferSelect;

export async function listSavedViews(memberId: string): Promise<SavedViewRow[]> {
  return db
    .select()
    .from(memberSavedViews)
    .where(eq(memberSavedViews.memberId, memberId))
    .orderBy(desc(memberSavedViews.createdAt));
}

export async function createSavedView(
  memberId: string,
  name: string,
  filters: unknown,
): Promise<SavedViewRow> {
  const rows = await db
    .insert(memberSavedViews)
    .values({ memberId, name: name.slice(0, 80), filters })
    .returning();
  return rows[0]!;
}

/** Phase 28: flip daily alert evaluation for one view (member-scoped). */
export async function setSavedViewAlert(
  memberId: string,
  viewId: string,
  enabled: boolean,
): Promise<boolean> {
  const rows = await db
    .update(memberSavedViews)
    .set({ alertEnabled: enabled })
    .where(and(eq(memberSavedViews.memberId, memberId), eq(memberSavedViews.id, viewId)))
    .returning({ id: memberSavedViews.id });
  return rows.length > 0;
}

export async function deleteSavedView(memberId: string, viewId: string): Promise<boolean> {
  const rows = await db
    .delete(memberSavedViews)
    .where(and(eq(memberSavedViews.memberId, memberId), eq(memberSavedViews.id, viewId)))
    .returning({ id: memberSavedViews.id });
  return rows.length > 0;
}

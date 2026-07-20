import { and, eq, sql } from "drizzle-orm";
import {
  FOUNDING_ACTIVE_STATUSES,
  tierFromSubscription,
  type MemberTier,
} from "@continuum/shared";
import { db } from "../client";
import { memberExportLog, memberSavedViews, memberSubscriptions, memberWatchlist } from "../schema";

/**
 * Billing data layer (Phase 29A/B). Stripe is the source of truth for
 * subscription STATE; this table is the synced mirror the entitlement layer
 * reads. Which statuses grant what is decided in @continuum/shared
 * entitlements.ts — never here.
 */

export type SubscriptionRow = typeof memberSubscriptions.$inferSelect;

export async function getSubscription(memberId: string): Promise<SubscriptionRow | null> {
  const rows = await db
    .select()
    .from(memberSubscriptions)
    .where(eq(memberSubscriptions.memberId, memberId));
  return rows[0] ?? null;
}

/** Checkout-completed path: bind the Stripe objects to the member. */
export async function upsertSubscription(input: {
  memberId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
  founding?: boolean;
}): Promise<void> {
  await db
    .insert(memberSubscriptions)
    .values({
      memberId: input.memberId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status: input.status,
      priceId: input.priceId,
      currentPeriodEnd: input.currentPeriodEnd,
      founding: input.founding ?? true,
    })
    .onConflictDoUpdate({
      target: memberSubscriptions.memberId,
      set: {
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        status: input.status,
        priceId: input.priceId,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

/**
 * Webhook sync path: subscription events carry the Stripe subscription id,
 * not our member id. Returns false when no row matches (event for an
 * unknown subscription — acknowledged, nothing to sync).
 */
export async function syncSubscriptionByStripeId(input: {
  stripeSubscriptionId: string;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
}): Promise<boolean> {
  const rows = await db
    .update(memberSubscriptions)
    .set({
      status: input.status,
      priceId: input.priceId ?? undefined,
      currentPeriodEnd: input.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(memberSubscriptions.stripeSubscriptionId, input.stripeSubscriptionId))
    .returning({ memberId: memberSubscriptions.memberId });
  return rows.length > 0;
}

/**
 * REAL active founding seat count — the number on /pricing and the checkout
 * gate. Counts entitlement-granting statuses only; never inflated.
 */
export async function countActiveFoundingSubscriptions(): Promise<number> {
  const statuses = FOUNDING_ACTIVE_STATUSES as readonly string[];
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(memberSubscriptions)
    .where(
      and(
        eq(memberSubscriptions.founding, true),
        sql`${memberSubscriptions.status} IN (${sql.join(
          statuses.map((s) => sql`${s}`),
          sql`, `,
        )})`,
      ),
    );
  return rows[0]?.n ?? 0;
}

/** Tier resolution for a signed-in member — the entitlement layer's input. */
export async function resolveMemberTier(memberId: string): Promise<Exclude<MemberTier, "anon">> {
  const subscription = await getSubscription(memberId);
  return tierFromSubscription(
    subscription === null ? null : { status: subscription.status, founding: subscription.founding },
  );
}

/** Current watch count — the free-tier limit gates ADDING in the action layer. */
export async function countWatchedEntities(memberId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(memberWatchlist)
    .where(eq(memberWatchlist.memberId, memberId));
  return rows[0]?.n ?? 0;
}

/** Alert-ENABLED saved views (the free tier allows 1). */
export async function countAlertEnabledViews(memberId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(memberSavedViews)
    .where(and(eq(memberSavedViews.memberId, memberId), eq(memberSavedViews.alertEnabled, true)));
  return rows[0]?.n ?? 0;
}

/** Exports since UTC midnight — rate-limit input (EXPORTS_PER_DAY). */
export async function countExportsToday(memberId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(memberExportLog)
    .where(
      and(
        eq(memberExportLog.memberId, memberId),
        sql`${memberExportLog.createdAt} >= date_trunc('day', now())`,
      ),
    );
  return rows[0]?.n ?? 0;
}

export async function logExport(memberId: string, kind: string, params: unknown): Promise<void> {
  await db.insert(memberExportLog).values({ memberId, kind, params });
}

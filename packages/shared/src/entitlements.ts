/**
 * The free/paid line (Phase 29B) — ONE module, pure functions, fixture
 * tested in verify-payments. Every gate in the product reads THIS file;
 * server actions enforce, UI merely reflects. No other module may define a
 * limit constant.
 *
 * Tiers:
 * - anon      → read-only public site (everything public stays public).
 * - free      → any signed-in member without an active founding subscription.
 * - founding  → active Stripe subscription on the founding price.
 *
 * Downgrade doctrine: limits gate ADDING, never existing data. A member who
 * drops from founding to free with 40 watched entities keeps all 40 visible
 * (read-only over the limit — they just cannot add more). Nothing is ever
 * deleted on downgrade.
 */

export type MemberTier = "anon" | "free" | "founding";

export type Entitlements = {
  /** Max watched entities; null = unlimited. */
  watchLimit: number | null;
  /** Max saved views with alerts ENABLED; null = unlimited. */
  alertViewLimit: number | null;
  /** Alert frequencies this tier may select ("off" is always allowed). */
  frequencies: readonly string[];
  /** CSV export of filtered listings and saved views. */
  exports: boolean;
  /** LLM entity briefs (capped separately — see BRIEF_MEMBER_MONTHLY_CAP). */
  briefs: boolean;
};

export const ENTITLEMENTS: Record<MemberTier, Entitlements> = {
  anon: {
    watchLimit: 0,
    alertViewLimit: 0,
    frequencies: ["off"],
    exports: false,
    briefs: false,
  },
  free: {
    watchLimit: 5,
    alertViewLimit: 1,
    frequencies: ["daily", "off"],
    exports: false,
    briefs: false,
  },
  founding: {
    watchLimit: null,
    alertViewLimit: null,
    frequencies: ["daily", "instant_important", "off"],
    exports: true,
    briefs: true,
  },
};

/** Founding-member usage caps (29B/29D) — deterministic numbers, no LLM math. */
export const EXPORTS_PER_DAY = 10;
export const BRIEF_MEMBER_MONTHLY_CAP = 20;
export const BRIEF_GLOBAL_DAILY_BUDGET_USD = 2.0;
/** Founding seat cap default; FOUNDING_CAP env overrides. */
export const FOUNDING_CAP_DEFAULT = 100;

/**
 * Stripe subscription statuses that KEEP founding entitlements. `past_due`
 * stays in — Stripe is still retrying the card and cutting access during a
 * bank hiccup is a dark pattern in reverse. Everything else (canceled,
 * unpaid, incomplete, incomplete_expired, paused) drops to free.
 */
export const FOUNDING_ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;

export function tierFromSubscription(
  subscription: { status: string; founding: boolean } | null,
): Exclude<MemberTier, "anon"> {
  if (
    subscription !== null &&
    subscription.founding &&
    (FOUNDING_ACTIVE_STATUSES as readonly string[]).includes(subscription.status)
  ) {
    return "founding";
  }
  return "free";
}

/** Gate for ADDING a watch. Existing rows above the limit stay (read-only). */
export function canAddWatch(tier: MemberTier, currentCount: number): boolean {
  const limit = ENTITLEMENTS[tier].watchLimit;
  return limit === null ? true : currentCount < limit;
}

/** Gate for ENABLING an alert on a saved view (disabling is always allowed). */
export function canEnableViewAlert(tier: MemberTier, currentEnabledCount: number): boolean {
  const limit = ENTITLEMENTS[tier].alertViewLimit;
  return limit === null ? true : currentEnabledCount < limit;
}

export function canUseFrequency(tier: MemberTier, frequency: string): boolean {
  return ENTITLEMENTS[tier].frequencies.includes(frequency);
}

export function canExport(tier: MemberTier): boolean {
  return ENTITLEMENTS[tier].exports;
}

export function canGenerateBrief(tier: MemberTier): boolean {
  return ENTITLEMENTS[tier].briefs;
}

/** Seat math (29A). The counter shown on /pricing is REAL — this is it. */
export function foundingSeatsLeft(cap: number, activeFoundingCount: number): number {
  return Math.max(0, cap - activeFoundingCount);
}

/** Checkout closes at the cap — "Founding seats filled — join the list". */
export function checkoutOpen(cap: number, activeFoundingCount: number): boolean {
  return foundingSeatsLeft(cap, activeFoundingCount) > 0;
}

/**
 * Minimal shape of the Stripe webhook events we sync. Pure mapper so the
 * webhook route stays a thin verified shell and verify-payments can fixture
 * the sync without network. Returns null for event types we ignore.
 */
export type SubscriptionSync = {
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  status: string;
  priceId: string | null;
  /** Unix seconds; null when the event carries no period end. */
  currentPeriodEnd: number | null;
};

export function subscriptionSyncFromEvent(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): SubscriptionSync | null {
  if (
    event.type !== "customer.subscription.updated" &&
    event.type !== "customer.subscription.deleted" &&
    event.type !== "customer.subscription.created"
  ) {
    return null;
  }
  const sub = event.data.object;
  const id = typeof sub.id === "string" ? sub.id : "";
  if (id === "") {
    return null;
  }
  // Deletion events may arrive with a stale status — a deleted subscription
  // is canceled, whatever the payload says.
  const status =
    event.type === "customer.subscription.deleted"
      ? "canceled"
      : typeof sub.status === "string"
        ? sub.status
        : "incomplete";
  const items = sub.items as { data?: { price?: { id?: string }; current_period_end?: number }[] } | undefined;
  const firstItem = items?.data?.[0];
  const priceId = firstItem?.price?.id ?? null;
  // Stripe moved current_period_end onto subscription items (2025 API);
  // accept both shapes so fixtures and live payloads agree.
  const periodEnd =
    typeof sub.current_period_end === "number"
      ? sub.current_period_end
      : typeof firstItem?.current_period_end === "number"
        ? firstItem.current_period_end
        : null;
  return {
    stripeSubscriptionId: id,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : null,
    status,
    priceId,
    currentPeriodEnd: periodEnd,
  };
}

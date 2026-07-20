"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { checkoutOpen } from "@continuum/shared";
import {
  countActiveFoundingSubscriptions,
  getMemberByClerkId,
  getSubscription,
  resolveMemberTier,
  upsertMemberProfile,
  upsertSubscription,
} from "@continuum/db";
import { foundingCap, getStripe, stripeConfigured } from "@/lib/billing";
import { SITE_ORIGIN } from "@/lib/public-labels";

/**
 * Checkout + billing portal actions (Phase 29A). The founding cap is
 * enforced HERE (server), not just in the UI — a stale page cannot
 * oversell seats. Pre-config mode: both actions no-op back to /pricing.
 */

async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host");
  if (host === null) {
    return SITE_ORIGIN;
  }
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function startCheckoutAction(): Promise<void> {
  if (!stripeConfigured()) {
    redirect("/pricing");
  }
  const { userId } = await auth();
  if (userId === null) {
    redirect("/sign-in?redirect_url=/pricing");
  }
  const user = await currentUser();
  let member = await getMemberByClerkId(userId);
  if (member === null) {
    member = await upsertMemberProfile({
      clerkUserId: userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      displayName: user?.firstName ?? null,
    });
  }
  if ((await resolveMemberTier(member.id)) === "founding") {
    redirect("/account");
  }
  // Seat gate — REAL count at the moment of checkout creation.
  const taken = await countActiveFoundingSubscriptions();
  if (!checkoutOpen(foundingCap(), taken)) {
    redirect("/pricing");
  }

  const stripe = getStripe();
  const existing = await getSubscription(member.id);
  let customerId = existing?.stripeCustomerId ?? null;
  if (customerId === null) {
    const email = member.email ?? user?.primaryEmailAddress?.emailAddress ?? null;
    const customer = await stripe.customers.create({
      ...(email !== null ? { email } : {}),
      metadata: { member_id: member.id, clerk_user_id: userId },
    });
    customerId = customer.id;
    // Bind the customer immediately so the webhook can always resolve the member.
    await upsertSubscription({
      memberId: member.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: existing?.stripeSubscriptionId ?? null,
      status: existing?.status ?? "incomplete",
      priceId: existing?.priceId ?? null,
      currentPeriodEnd: existing?.currentPeriodEnd ?? null,
    });
  }

  const origin = await requestOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_FOUNDING!, quantity: 1 }],
    success_url: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing/cancelled`,
    metadata: { member_id: member.id },
    subscription_data: { metadata: { member_id: member.id } },
    allow_promotion_codes: false,
  });
  if (session.url === null) {
    redirect("/pricing");
  }
  redirect(session.url);
}

/** Billing portal — subscribers manage/cancel there; we never hide the door. */
export async function openPortalAction(): Promise<void> {
  if (!stripeConfigured()) {
    redirect("/account");
  }
  const { userId } = await auth();
  if (userId === null) {
    redirect("/sign-in");
  }
  const member = await getMemberByClerkId(userId);
  const subscription = member === null ? null : await getSubscription(member.id);
  if (subscription?.stripeCustomerId == null) {
    redirect("/account");
  }
  const origin = await requestOrigin();
  const portal = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/account`,
  });
  redirect(portal.url);
}

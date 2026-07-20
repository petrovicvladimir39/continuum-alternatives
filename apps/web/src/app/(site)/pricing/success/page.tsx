import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getMemberByClerkId, upsertSubscription } from "@continuum/db";
import { getStripe, stripeConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

/**
 * Checkout success (Phase 29A). Syncs the subscription EAGERLY from the
 * session id so the member's gates open on this very page load — the
 * webhook remains the durable path, this removes the race.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  if (!stripeConfigured()) {
    redirect("/pricing");
  }
  const { userId } = await auth();
  if (userId === null) {
    redirect("/pricing");
  }
  const { session_id: sessionId } = await searchParams;

  let synced = false;
  if (sessionId !== undefined && sessionId !== "") {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const member = await getMemberByClerkId(userId);
      const memberId = session.metadata?.member_id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      // The session must belong to THIS signed-in member — no cross-account sync.
      if (member !== null && memberId === member.id && subscriptionId !== undefined) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const item = subscription.items.data[0];
        await upsertSubscription({
          memberId: member.id,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          priceId: item?.price.id ?? null,
          currentPeriodEnd:
            item?.current_period_end !== undefined
              ? new Date(item.current_period_end * 1000)
              : null,
        });
        synced = true;
      }
    } catch {
      // Webhook will complete the sync; the page stays honest below.
    }
  }

  return (
    <div className="max-w-xl py-12">
      <h1 className="type-h1">Welcome, founding member</h1>
      <p className="mt-3 text-[14px] leading-[1.55] text-ink-secondary">
        {synced
          ? "Your membership is active. Unlimited watching, instant alerts, exports, and entity briefs are open now."
          : "Payment received. Your membership activates within a minute — refresh your account page if it has not appeared yet."}
      </p>
      <p className="mt-5 flex gap-4 text-[13px]">
        <Link href="/account" className="text-accent hover:underline">
          Your account →
        </Link>
        <Link href="/account/watchlist" className="text-accent hover:underline">
          Watchlist →
        </Link>
      </p>
    </div>
  );
}

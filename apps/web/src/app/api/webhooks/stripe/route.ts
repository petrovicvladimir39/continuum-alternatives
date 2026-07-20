import type Stripe from "stripe";
import { subscriptionSyncFromEvent } from "@continuum/shared";
import {
  syncSubscriptionByStripeId,
  syncVendorSubscriptionByStripeId,
  upsertSubscription,
  upsertVendorSubscription,
} from "@continuum/db";
import { getStripe } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Stripe → member_subscriptions sync (Phase 29A), signature-verified.
 *
 * - checkout.session.completed → bind subscription to the member (metadata
 *   .member_id set at session creation) and store live status + period end.
 * - customer.subscription.updated/deleted → sync status + period end via the
 *   pure mapper in @continuum/shared (fixture-tested in verify-payments).
 * - Missing STRIPE_WEBHOOK_SECRET → 503 (pre-config mode). Bad signature →
 *   400. Unknown subscription ids acknowledge with 200 — Stripe should not
 *   retry events we will never match.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return new Response("webhook not configured", { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const memberId = session.metadata?.member_id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (memberId === undefined || memberId === "" || subscriptionId === undefined) {
        return new Response("no member binding", { status: 200 });
      }
      // Fetch the live subscription — the session payload has no status/period.
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
      const item = subscription.items.data[0];
      // Phase 33B: vendor checkouts carry vendor_entity_id and bind to the ORG.
      const vendorEntityId = session.metadata?.vendor_entity_id;
      if (vendorEntityId !== undefined && vendorEntityId !== "") {
        await upsertVendorSubscription({
          entityId: vendorEntityId,
          memberId,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          priceId: item?.price.id ?? null,
          currentPeriodEnd:
            item?.current_period_end !== undefined ? new Date(item.current_period_end * 1000) : null,
        });
        return new Response("ok", { status: 200 });
      }
      await upsertSubscription({
        memberId,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        priceId: item?.price.id ?? null,
        currentPeriodEnd:
          item?.current_period_end !== undefined ? new Date(item.current_period_end * 1000) : null,
      });
      return new Response("ok", { status: 200 });
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sync = subscriptionSyncFromEvent(
        event as unknown as { type: string; data: { object: Record<string, unknown> } },
      );
      if (sync === null) {
        return new Response("ignored", { status: 200 });
      }
      const periodEnd = sync.currentPeriodEnd === null ? null : new Date(sync.currentPeriodEnd * 1000);
      const matched = await syncSubscriptionByStripeId({
        stripeSubscriptionId: sync.stripeSubscriptionId,
        status: sync.status,
        priceId: sync.priceId,
        currentPeriodEnd: periodEnd,
      });
      // Not a member subscription → try the vendor table (33B).
      const vendorMatched = matched
        ? false
        : await syncVendorSubscriptionByStripeId({
            stripeSubscriptionId: sync.stripeSubscriptionId,
            status: sync.status,
            currentPeriodEnd: periodEnd,
          });
      return new Response(matched || vendorMatched ? "ok" : "unknown subscription", { status: 200 });
    }
    default:
      return new Response("ignored", { status: 200 });
  }
}

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { checkoutOpen } from "@continuum/shared";
import { countActiveFoundingSubscriptions, getMemberByClerkId, resolveMemberTier } from "@continuum/db";
import { SubscribeBlock } from "@/components/subscribe-block";
import { Button } from "@/components/ui/button";
import { foundingCap, getFoundingPrice, stripeConfigured } from "@/lib/billing";
import { openPortalAction, startCheckoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Free access to Europe's alternative-asset record, and a founding membership for the people who work in it.",
};

/**
 * /pricing (Phase 29C) — two columns, both honest. The seat counter is the
 * REAL count of active founding subscriptions; there is no other number.
 * PROHIBITED here by the phase constitution: fake scarcity, countdown
 * timers, exit intents, feature teasing, urgency theatrics of any kind.
 */

const FREE_FEATURES = [
  "The full public record — news, company, fund and deal profiles, map, search",
  "Watch up to 5 entities with a daily change email",
  "Saved views from the ask bar, 1 with alerts enabled",
  "The Continuum Brief newsletter (choose your channels)",
];

const FOUNDING_FEATURES = [
  "Unlimited watched entities and alert-enabled saved views",
  "Instant email for important events (insolvencies, fund closes) — rest daily",
  "CSV export of any filtered listing or saved view (10 per day)",
  "Entity briefs — sourced, cited summaries on any profile (20 fresh per month)",
  "Founding price locked for life",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[13px] leading-[1.5] text-ink-secondary">
          <span aria-hidden className="text-ink-muted">
            —
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "How does billing work?",
    a: "Payment runs through Stripe at the interval shown on this page. You get an invoice by email; VAT is handled at checkout. We never store card details.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from the billing portal on your account page — no email, no retention flow. Access runs to the end of the paid period. Your watchlist and saved views are never deleted: anything over the free limits simply becomes read-only.",
  },
  {
    q: "What does “founding” mean?",
    a: "The platform is early. Coverage is deepest in Central and South-Eastern Europe and still uneven elsewhere; features arrive steadily but the record is a work in progress. Founding members fund that work, keep this price for as long as they stay subscribed, and are capped at a fixed seat count. The seat counter shown while checkout is open is the live number, not marketing.",
  },
];

export default async function PricingPage() {
  const configured = stripeConfigured();
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
  const price = configured ? await getFoundingPrice() : null;
  const cap = foundingCap();
  const taken = configured ? await countActiveFoundingSubscriptions() : 0;
  const open = configured && price !== null && checkoutOpen(cap, taken);

  let tier: "anon" | "free" | "founding" = "anon";
  if (clerkEnabled) {
    const { userId } = await auth();
    if (userId !== null) {
      const member = await getMemberByClerkId(userId);
      tier = member === null ? "free" : await resolveMemberTier(member.id);
    }
  }

  return (
    <div className="max-w-3xl py-12">
      <h1 className="type-h1">Membership</h1>
      <p className="mt-3 max-w-2xl text-[14px] leading-[1.55] text-ink-secondary">
        The record itself stays public — profiles, news, the map, search. Membership adds the
        working layer on top: watchlists, alerts, exports, and briefs.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* ── Free ── */}
        <section className="border border-line p-5">
          <h2 className="font-serif text-[20px] font-medium text-ink">Free</h2>
          <p className="type-data mt-1 text-ink-secondary">€0</p>
          <FeatureList items={FREE_FEATURES} />
          {tier === "anon" && clerkEnabled ? (
            <p className="mt-5 text-[13px]">
              <Link href="/sign-up" className="text-accent hover:underline">
                Create a free account →
              </Link>
            </p>
          ) : null}
        </section>

        {/* ── Founding ── */}
        <section className="border border-line-strong p-5">
          <h2 className="font-serif text-[20px] font-medium text-ink">Founding Membership</h2>
          {price !== null ? (
            <p className="type-data mt-1 text-ink">
              {price.display}
              <span className="ml-2 text-ink-muted">locked for life</span>
            </p>
          ) : (
            <p className="mt-1 text-[13px] text-ink-secondary">Memberships open soon.</p>
          )}
          {configured ? (
            <p className="type-data mt-2 text-[12px] text-ink-muted">
              {taken} of {cap} founding seats taken
            </p>
          ) : null}
          <FeatureList items={FOUNDING_FEATURES} />
          <div className="mt-5">
            {tier === "founding" ? (
              <form action={openPortalAction}>
                <p className="text-[13px] text-ink-secondary">You are a founding member.</p>
                <button type="submit" className="mt-1 text-[13px] text-accent hover:underline">
                  Manage billing →
                </button>
              </form>
            ) : open ? (
              <form action={startCheckoutAction}>
                <Button type="submit">Become a founding member</Button>
                <p className="type-small mt-2 text-ink-muted">
                  Checkout via Stripe. Cancel any time from your account.
                </p>
              </form>
            ) : configured && price !== null ? (
              <div>
                <p className="text-[13px] text-ink-secondary">
                  Founding seats filled — join the list and we will write when access reopens.
                </p>
                <div className="mt-3">
                  <SubscribeBlock compact />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[13px] text-ink-secondary">
                  Memberships open soon. The Brief will carry the announcement — it costs nothing
                  and needs no account.
                </p>
                <div className="mt-3">
                  <SubscribeBlock compact />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 max-w-2xl">
        <h2 className="type-h2">Questions</h2>
        <dl className="mt-4 space-y-5">
          {FAQ.map((item) => (
            <div key={item.q} className="border-t border-line pt-3">
              <dt className="text-[14px] font-medium text-ink">{item.q}</dt>
              <dd className="mt-1 text-[13px] leading-[1.55] text-ink-secondary">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

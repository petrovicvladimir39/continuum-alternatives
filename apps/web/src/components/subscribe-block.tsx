"use client";

import { useActionState, useEffect, useRef } from "react";
import { CHANNELS } from "@continuum/shared";
import { subscribeAction, type SubscribeState } from "@/app/(site)/subscribe/actions";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/**
 * Inline, quiet subscription block (Phase 23A) — no popups, no modals, no
 * exit intent, styleguide-strict (hairline borders, no decoration). Placed
 * on the homepage quiet band, /digest, article footers, /reports, and
 * /subscribe itself.
 */

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  distressed: "Insolvencies, NPL portfolios, enforcement, bankruptcy asset sales",
  private_credit: "Lending, credit facilities, refinancings, non-bank lenders",
  vc_founders: "Venture rounds, startups, accelerators",
  pe: "Buyouts, growth equity, fund-backed M&A",
  lp_institutional: "Fund closes, fundraising, LP commitments",
  vendors: "Advisor, servicer, and law-firm mandates",
};

const initialState: SubscribeState = { status: "idle" };

export function SubscribeBlock({
  compact = false,
  defaultEmail = "",
}: {
  compact?: boolean;
  defaultEmail?: string;
}) {
  const [state, formAction] = useActionState(subscribeAction, initialState);
  const tracked = useRef(false);

  useEffect(() => {
    if (
      !tracked.current &&
      (state.status === "pending_sent" || state.status === "pending_unmailed" || state.status === "active")
    ) {
      tracked.current = true;
      trackEvent("subscribe_submitted");
    }
  }, [state.status]);

  if (state.status === "pending_sent" || state.status === "pending_unmailed" || state.status === "active") {
    return (
      <div className="border border-line p-4">
        <p className="text-[14px] font-medium text-ink">The Continuum Brief</p>
        <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-secondary">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-line p-4">
      <p className="text-[14px] font-medium text-ink">The Continuum Brief</p>
      <p className="mt-1 text-[13px] leading-[1.5] text-ink-secondary">
        The channel-based digest of Europe&apos;s alternative-asset record. Choose what you follow —
        we send exactly that, nothing else.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@firm.com"
          defaultValue={defaultEmail}
          className="min-w-[220px] flex-1 border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-line-strong"
        />
        <Button type="submit">Subscribe</Button>
      </div>
      <fieldset className="mt-3">
        <legend className="type-label mb-1.5">Channels</legend>
        <div className={compact ? "flex flex-wrap gap-x-5 gap-y-1" : "grid grid-cols-1 gap-1 sm:grid-cols-2"}>
          {CHANNELS.map((channel) => (
            <label key={channel} className="flex items-baseline gap-1.5 text-[13px] text-ink">
              <input type="checkbox" name="channels" value={channel} className="translate-y-[1px]" />
              <span>
                {channel.replace("_", " ")}
                {!compact ? (
                  <span className="block text-[11px] leading-[1.4] text-ink-muted">
                    {CHANNEL_DESCRIPTIONS[channel]}
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 flex items-baseline gap-1.5 text-[12px] leading-[1.5] text-ink-secondary">
        <input type="checkbox" name="consent" required className="translate-y-[1px]" />
        <span>
          I consent to receiving the selected email digests. Consent is logged with a timestamp;
          every email carries a one-click unsubscribe that takes effect immediately (GDPR).
        </span>
      </label>
      {state.status === "error" ? (
        <p className="mt-2 text-[12px] text-distressed">{state.message}</p>
      ) : null}
    </form>
  );
}

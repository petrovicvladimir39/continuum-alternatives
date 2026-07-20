import type { Metadata } from "next";
import { SubscribeBlock } from "@/components/subscribe-block";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Subscribe to the Continuum Brief — the channel-based digest of Europe's alternative-asset record. Double opt-in, one-click unsubscribe.",
};

export default function SubscribePage() {
  return (
    <div className="max-w-xl py-12">
      <h1 className="type-h1">Subscribe</h1>
      <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
        The Continuum Brief goes out per channel — you receive only the channels you choose.
        Subscription is double opt-in: nothing is sent until you confirm from your inbox, and
        every email carries a one-click unsubscribe that takes effect immediately.
      </p>
      <div className="mt-6">
        <SubscribeBlock />
      </div>
    </div>
  );
}

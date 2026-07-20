import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checkout cancelled",
  robots: { index: false, follow: false },
};

/** Checkout cancel route (Phase 29A) — nothing charged, no win-back copy. */
export default function CheckoutCancelledPage() {
  return (
    <div className="max-w-xl py-12">
      <h1 className="type-h1">Checkout cancelled</h1>
      <p className="mt-3 text-[14px] leading-[1.55] text-ink-secondary">
        Nothing was charged. The free tier stays yours either way.
      </p>
      <p className="mt-5 text-[13px]">
        <Link href="/pricing" className="text-accent hover:underline">
          Back to membership →
        </Link>
      </p>
    </div>
  );
}

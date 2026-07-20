import type { Metadata } from "next";
import Link from "next/link";
import { confirmByToken } from "@continuum/db";
import { TrackView } from "@/components/track-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm subscription",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = UUID_RE.test(token) ? await confirmByToken(token) : "invalid";

  return (
    <div className="max-w-xl py-12">
      {result === "activated" ? (
        <>
          <TrackView event="subscribe_confirmed" />
          <h1 className="type-h1">Subscription confirmed</h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
            You are on the list. The Continuum Brief arrives on your chosen channels; every issue
            carries a one-click unsubscribe.
          </p>
        </>
      ) : result === "already_active" ? (
        <>
          <h1 className="type-h1">Already confirmed</h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
            This subscription was already active — nothing to do.
          </p>
        </>
      ) : (
        <>
          <h1 className="type-h1">Link no longer valid</h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
            This confirmation link is invalid or has been superseded (re-subscribing issues a
            fresh link, and unsubscribed addresses are never re-activated by old emails). You can{" "}
            <Link href="/subscribe" className="text-accent hover:underline">
              subscribe again
            </Link>{" "}
            at any time.
          </p>
        </>
      )}
      <p className="mt-6 text-[13px]">
        <Link href="/" className="text-accent hover:underline">
          ← Continuum Alternatives
        </Link>
      </p>
    </div>
  );
}

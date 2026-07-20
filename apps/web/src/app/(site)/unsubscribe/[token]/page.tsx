import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeByToken } from "@continuum/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One-click, immediate — the GET itself unsubscribes; no second step. */
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = UUID_RE.test(token) ? await unsubscribeByToken(token) : "invalid";

  return (
    <div className="max-w-xl py-12">
      {result === "unsubscribed" || result === "already_unsubscribed" ? (
        <>
          <h1 className="type-h1">Unsubscribed</h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
            {result === "unsubscribed"
              ? "Done — effective immediately. You will receive no further emails."
              : "This address was already unsubscribed — you will receive no emails."}{" "}
            If you change your mind, you can{" "}
            <Link href="/subscribe" className="text-accent hover:underline">
              subscribe again
            </Link>{" "}
            (a fresh confirmation will be required).
          </p>
        </>
      ) : (
        <>
          <h1 className="type-h1">Link not recognized</h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
            This unsubscribe link is not valid. If you keep receiving unwanted email, write to{" "}
            <a href="mailto:hello@continuumalternatives.com" className="text-accent hover:underline">
              hello@continuumalternatives.com
            </a>{" "}
            and we will remove you manually.
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

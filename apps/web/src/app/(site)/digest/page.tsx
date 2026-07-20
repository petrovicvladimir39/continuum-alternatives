import type { Metadata } from "next";
import Link from "next/link";
import { db, desc, digests, eq, sql } from "@continuum/db";
import { SubscribeBlock } from "@/components/subscribe-block";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Digest",
  description: "The Continuum Brief archive — European alternative-asset events.",
};

export default async function DigestIndexPage() {
  const rows = await db
    .select({
      id: digests.id,
      digestDate: digests.digestDate,
      subject: digests.subject,
      channelCounts: sql<{ channel: string; n: number }[]>`(
        SELECT coalesce(json_agg(t), '[]'::json) FROM (
          SELECT channel, count(*)::int AS n FROM digest_items di
          WHERE di.digest_id = digests.id AND di.included = true
          GROUP BY channel ORDER BY channel
        ) t
      )`,
    })
    .from(digests)
    .where(eq(digests.status, "sent"))
    .orderBy(desc(digests.digestDate));

  return (
    <div className="py-12">
      <h1 className="type-h1">Continuum Brief</h1>
      <p className="mt-2 max-w-xl text-ink-secondary">
        The digest of European alternative-asset events — insolvencies, asset sales, deals and
        mandates, from primary sources.
      </p>
      <div className="mt-6 max-w-xl">
        <SubscribeBlock />
      </div>
      <div className="mt-8 space-y-6">
        {rows.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No issues published yet.</p>
        ) : (
          rows.map((digest) => (
            <div key={digest.id} className="border-t border-line pt-4">
              <Link
                href={`/digest/${String(digest.digestDate)}`}
                className="type-h3 text-accent hover:underline"
              >
                {digest.subject ?? String(digest.digestDate)}
              </Link>
              <p className="type-data mt-1 text-ink-muted">
                {digest.channelCounts.map((entry) => `${entry.channel} ${entry.n}`).join(" · ")}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

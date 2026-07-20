import Link from "next/link";
import { db, desc, digests, eq, homeStats, listAuctions, listFeed } from "@continuum/db";
import { StatBlock } from "@/components/ui/stat-block";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS, countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

/**
 * The data-first landing: no hero promise — the platform opens on itself.
 * Everything below renders from the live approved record.
 */
export default async function Home() {
  const [stats, feed, auctions, sentDigests] = await Promise.all([
    homeStats(),
    listFeed({ page: 1 }),
    listAuctions("upcoming"),
    db
      .select({ digestDate: digests.digestDate })
      .from(digests)
      .where(eq(digests.status, "sent"))
      .orderBy(desc(digests.digestDate))
      .limit(1),
  ]);
  const latestFeed = feed.items.slice(0, 6);
  const nextAuctions = auctions.rows.slice(0, 3);
  const latestDigest = sentDigests[0]?.digestDate ?? null;

  return (
    <div className="py-12">
      <header>
        <h1 className="type-h1 max-w-2xl">The record of private capital in emerging Europe.</h1>
        <div className="mt-6 flex flex-wrap gap-x-12 gap-y-4 border-y border-line py-4">
          <StatBlock value={String(stats.activeEntities)} label="Active entities" />
          <StatBlock value={String(stats.countries)} label="Countries" />
          <StatBlock value={String(stats.factsTracked)} label="Facts tracked" />
          <StatBlock value={String(stats.sourcesMonitored)} label="Sources monitored" />
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="type-h2">Latest</h2>
            <Link href="/feed" className="type-small text-accent hover:underline">
              Open the feed →
            </Link>
          </div>
          <div className="mt-3">
            {latestFeed.map((item) => (
              <div key={item.id} className="border-t border-line py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="type-data w-[88px] shrink-0 text-ink-muted">
                    {item.occurredOn}
                  </span>
                  <div className="min-w-0 flex-1">
                    {item.entityHref !== null ? (
                      <Link href={item.entityHref} className="text-[14px] font-medium hover:text-accent">
                        {item.title}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-medium">{item.title}</span>
                    )}
                    <p className="type-small mt-0.5 text-ink-secondary">
                      {item.entityName}
                      {item.entityCountry !== null ? ` · ${countryName(item.entityCountry)}` : ""}
                    </p>
                  </div>
                  <span className="hidden shrink-0 gap-1.5 sm:flex">
                    {item.channels.slice(0, 2).map((value) => (
                      <Tag key={value} variant={CHANNEL_TAG_VARIANTS[value] ?? "neutral"}>
                        {value}
                      </Tag>
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          {/* Static map teaser — deliberately NO embedded MapLibre here; the
              homepage stays light. */}
          <div className="rounded-md border border-line bg-surface p-4">
            <h2 className="type-label">The map</h2>
            <p className="mt-2 text-[13px] leading-[1.5] text-ink-secondary">
              {stats.activeEntities} entities across {stats.countries} countries, plotted by
              headquarters and colored by capital type.
            </p>
            <Link href="/map" className="mt-3 inline-block text-[13px] text-accent hover:underline">
              Open the map →
            </Link>
          </div>

          <div className="rounded-md border border-line bg-surface p-4">
            <h2 className="type-label">Next auctions</h2>
            {nextAuctions.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-secondary">
                No upcoming sales on file right now.
              </p>
            ) : (
              <ul className="mt-2 space-y-2.5">
                {nextAuctions.map((row) => (
                  <li key={row.factId} className="text-[13px] leading-[1.4]">
                    <span className="type-data text-ink-muted">{row.saleDate}</span>{" "}
                    {row.debtorHref !== null ? (
                      <Link href={row.debtorHref} className="font-medium hover:text-accent">
                        {row.debtorName}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.debtorName}</span>
                    )}
                    {row.place !== null ? (
                      <span className="text-ink-muted"> · {row.place}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/auctions"
              className="mt-3 inline-block text-[13px] text-accent hover:underline"
            >
              Auction tracker →
            </Link>
          </div>

          <div className="rounded-md border border-line bg-surface p-4">
            <h2 className="type-label">The brief</h2>
            <p className="mt-2 text-[13px] leading-[1.5] text-ink-secondary">
              {latestDigest !== null
                ? `Latest issue: ${String(latestDigest)}.`
                : "The channel-based digest of the week's record."}
            </p>
            {/* Real signup arrives in Phase 19 — until then, Subscribe points
                at the public digest archive. */}
            <p className="mt-3 flex gap-4 text-[13px]">
              <Link href="/digest" className="text-accent hover:underline">
                Subscribe
              </Link>
              <Link href="/digest" className="text-ink-secondary hover:text-accent">
                Archive →
              </Link>
            </p>
          </div>
        </aside>
      </div>

      <footer className="mt-12 border-t border-line pt-4">
        <p className="type-small text-ink-muted">
          Built from primary sources — court and insolvency registries, official gazettes, and
          regional press — with every fact citing where it came from.{" "}
          <a href="mailto:hello@continuumalternatives.com" className="hover:text-accent">
            hello@continuumalternatives.com
          </a>
        </p>
      </footer>
    </div>
  );
}

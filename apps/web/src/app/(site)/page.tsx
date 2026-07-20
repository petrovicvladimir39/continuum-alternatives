import Link from "next/link";
import {
  auctionStats,
  channelColumn,
  db,
  desc,
  digests,
  eq,
  homeStats,
  latestRecorded,
  leadCandidates,
  listAuctions,
  type FeedItem,
  type LeadCandidate,
} from "@continuum/db";
import { FACT_PRIORITY } from "@continuum/pipeline";
import { timeAgo, visibleHomeSections } from "@continuum/shared";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS, countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

/**
 * Bloomberg-density front page (Phase 19): stat strip · lead story · latest
 * rail · channel band · auctions rail · bottom band. Strictly tokens — density
 * comes from hairlines and tabular figures, not decoration. Sections render
 * only when populated (visibleHomeSections — zero empty states).
 */

function rankLead(candidates: LeadCandidate[]): LeadCandidate | null {
  const sorted = [...candidates].sort((a, b) => {
    const pa = FACT_PRIORITY[a.factType] ?? 4;
    const pb = FACT_PRIORITY[b.factType] ?? 4;
    if (pa !== pb) {
      return pa - pb;
    }
    const ca = Number.parseFloat(a.confidence);
    const cb = Number.parseFloat(b.confidence);
    if (ca !== cb) {
      return cb - ca;
    }
    return a.occurredOn < b.occurredOn ? 1 : -1;
  });
  return sorted[0] ?? null;
}

function CompactRow({ item }: { item: FeedItem }) {
  return (
    <div className="border-t border-line py-2.5">
      <span className="type-data text-ink-muted">{item.occurredOn}</span>{" "}
      {item.entityHref !== null ? (
        <Link href={item.entityHref} className="text-[13px] font-medium leading-[1.4] hover:text-accent">
          {item.title}
        </Link>
      ) : (
        <span className="text-[13px] font-medium leading-[1.4]">{item.title}</span>
      )}
      <p className="type-small mt-0.5 text-ink-muted">
        {item.entityName}
        {item.entityCountry !== null ? ` · ${countryName(item.entityCountry)}` : ""}
      </p>
    </div>
  );
}

export default async function Home() {
  const now = new Date();
  const [stats, auctionsAll, candidates, latest, colDistressed, colEquity, colInstitutions, sentDigests] =
    await Promise.all([
      homeStats(),
      auctionStats(),
      leadCandidates(),
      latestRecorded(8),
      channelColumn(["distressed", "private_credit"], 5),
      channelColumn(["pe", "vc_founders"], 5),
      channelColumn(["lp_institutional", "vendors"], 5),
      db
        .select({ digestDate: digests.digestDate })
        .from(digests)
        .where(eq(digests.status, "sent"))
        .orderBy(desc(digests.digestDate))
        .limit(1),
    ]);
  const upcoming = await listAuctions("upcoming");
  const nextAuctions = upcoming.rows.slice(0, 5);
  const lead = rankLead(candidates);
  const latestRail = latest.filter((item) => item.id !== lead?.id).slice(0, 8);
  const latestDigest = sentDigests[0]?.digestDate ?? null;

  const sections = visibleHomeSections({
    lead: lead !== null,
    latestCount: latestRail.length,
    channelColumnCounts: [colDistressed.length, colEquity.length, colInstitutions.length],
    auctionsCount: nextAuctions.length,
    hasDigest: latestDigest !== null,
  });
  const show = (key: string) => sections.includes(key);

  const channelColumns: { title: string; items: FeedItem[] }[] = [
    { title: "Distressed & credit", items: colDistressed },
    { title: "Private equity & VC", items: colEquity },
    { title: "Institutions & funds", items: colInstitutions },
  ].filter((column) => column.items.length > 0);

  return (
    <div className="pb-12">
      {/* 1 · Stat strip — ticker register, hairline band, no animation. */}
      <div className="-mx-6 border-b border-line px-6">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1 py-2.5">
          {(
            [
              ["Entities", stats.activeEntities],
              ["Countries", stats.countries],
              ["Facts", stats.factsTracked],
              ["Upcoming auctions", auctionsAll.upcoming],
              ["Sources", stats.sourcesMonitored],
            ] as const
          ).map(([label, value]) => (
            <span key={label} className="flex items-baseline gap-1.5">
              <span className="type-data font-medium">{value}</span>
              <span className="type-label">{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 2 · Lead story + latest rail. */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {show("lead") && lead !== null ? (
            <article>
              <p className="type-label">Lead</p>
              {lead.entityHref !== null ? (
                <Link href={lead.entityHref} className="hover:text-accent">
                  <h1 className="type-h1 mt-2 max-w-xl">{lead.title}</h1>
                </Link>
              ) : (
                <h1 className="type-h1 mt-2 max-w-xl">{lead.title}</h1>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="type-data text-ink-muted">{lead.occurredOn}</span>
                <span className="text-[13px] text-ink-secondary">
                  {lead.entityName}
                  {lead.entityCountry !== null ? ` · ${countryName(lead.entityCountry)}` : ""}
                </span>
                {lead.channels.map((channel) => (
                  <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
                    {channel}
                  </Tag>
                ))}
              </div>
              {lead.excerpt !== null && lead.excerpt !== "" ? (
                <blockquote className="type-small mt-4 max-w-xl border-l-2 border-line-strong pl-3 text-ink-secondary">
                  “{lead.excerpt}”
                </blockquote>
              ) : null}
              {lead.sourceName !== null ? (
                <p className="type-small mt-3 text-ink-muted">
                  Source:{" "}
                  {lead.sourceUrl !== null ? (
                    <a
                      href={lead.sourceUrl}
                      rel="noopener noreferrer"
                      className="underline decoration-line-strong underline-offset-2 hover:text-accent"
                    >
                      {lead.sourceName}
                    </a>
                  ) : (
                    lead.sourceName
                  )}
                </p>
              ) : null}
            </article>
          ) : null}

          {/* 3 · Channel band — three columns, populated only. */}
          {show("channel-band") && channelColumns.length > 0 ? (
            <div
              className={`mt-10 grid grid-cols-1 gap-8 border-t border-line pt-6 ${
                // Tailwind needs literal class names — no runtime interpolation.
                channelColumns.length >= 3
                  ? "sm:grid-cols-3"
                  : channelColumns.length === 2
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-1"
              }`}
            >
              {channelColumns.map((column) => (
                <section key={column.title}>
                  <h2 className="type-label">{column.title}</h2>
                  <div className="mt-1">
                    {column.items.map((item) => (
                      <CompactRow key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>

        {/* Latest rail — timestamped, Bloomberg right-rail register. */}
        {show("latest") ? (
          <aside>
            <h2 className="type-label">Latest</h2>
            <div className="mt-1">
              {latestRail.map((item) => (
                <div key={item.id} className="border-t border-line py-2.5">
                  <span className="type-data text-ink-muted">
                    {item.recordedAt !== null ? timeAgo(item.recordedAt, now) : item.occurredOn}
                  </span>{" "}
                  {item.entityHref !== null ? (
                    <Link
                      href={item.entityHref}
                      className="text-[13px] leading-[1.4] hover:text-accent"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span className="text-[13px] leading-[1.4]">{item.title}</span>
                  )}
                </div>
              ))}
            </div>
            <Link href="/feed" className="type-small mt-2 inline-block text-accent hover:underline">
              All news →
            </Link>
          </aside>
        ) : null}
      </div>

      {/* 4 · Auctions rail. */}
      {show("auctions-rail") ? (
        <section className="mt-10 border-t border-line pt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="type-label">Next auctions</h2>
            <Link href="/auctions" className="type-small text-accent hover:underline">
              Auction tracker →
            </Link>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-5">
            {nextAuctions.map((row) => (
              <div key={row.factId} className="border-t border-line py-2.5">
                <p className="type-data text-ink-muted">
                  {row.saleDate} ·{" "}
                  {row.daysUntil === 0
                    ? "today"
                    : `in ${row.daysUntil} day${row.daysUntil === 1 ? "" : "s"}`}
                </p>
                {row.debtorHref !== null ? (
                  <Link
                    href={row.debtorHref}
                    className="mt-0.5 block truncate text-[13px] font-medium hover:text-accent"
                  >
                    {row.debtorName}
                  </Link>
                ) : (
                  <span className="mt-0.5 block truncate text-[13px] font-medium">
                    {row.debtorName}
                  </span>
                )}
                {row.place !== null ? (
                  <p className="type-small text-ink-muted">{row.place}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 5 · Bottom band — map teaser · digest · reports promo. */}
      <section className="mt-10 grid grid-cols-1 gap-8 border-t border-line pt-6 sm:grid-cols-3">
        <div>
          <h2 className="type-label">The map</h2>
          <p className="type-small mt-2 leading-[1.5] text-ink-secondary">
            {stats.activeEntities} entities · {stats.countries} countries, plotted by headquarters
            and colored by capital type.
          </p>
          <Link href="/map" className="type-small mt-2 inline-block text-accent hover:underline">
            Open the map →
          </Link>
        </div>
        <div>
          <h2 className="type-label">The brief</h2>
          <p className="type-small mt-2 leading-[1.5] text-ink-secondary">
            {latestDigest !== null
              ? `Latest issue: ${String(latestDigest)}.`
              : "The channel-based digest of the week's record."}
          </p>
          <Link href="/digest" className="type-small mt-2 inline-block text-accent hover:underline">
            Read the digest →
          </Link>
        </div>
        <div>
          <h2 className="type-label">Reports</h2>
          <p className="type-small mt-2 leading-[1.5] text-ink-secondary">
            Data-compiled research from the record — starting with the Serbian Insolvency Monitor.
          </p>
          <Link href="/reports" className="type-small mt-2 inline-block text-accent hover:underline">
            Browse reports →
          </Link>
        </div>
      </section>
    </div>
  );
}

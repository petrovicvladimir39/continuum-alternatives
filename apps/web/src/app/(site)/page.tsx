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
  listPublishedArticles,
  type ArticleListItem,
  type FeedItem,
  type LeadCandidate,
} from "@continuum/db";
import { FACT_PRIORITY } from "@continuum/pipeline";
import { diversifyRail, pickRotatedLead, timeAgo, visibleHomeSections } from "@continuum/shared";
import { EntityLogo } from "@/components/ui/entity-logo";
import { SubscribeBlock } from "@/components/subscribe-block";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS, countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

/**
 * Bloomberg front (reset build Part 6): stat strip · LEAD article (oversized
 * serif, entity logo anchor) · timestamped Latest rail · three dense channel
 * rails (article headlines serif, wire fact-lines sans) · auctions demoted to
 * the bottom quiet band. Strictly tokens; sections render only when populated.
 * When no article is published yet, the lead falls back to the ranked fact.
 */

const CHANNEL_GROUPS: { title: string; channels: string[] }[] = [
  { title: "Distressed & credit", channels: ["distressed", "private_credit"] },
  { title: "Private equity & VC", channels: ["pe", "vc_founders"] },
  { title: "Institutions & funds", channels: ["lp_institutional", "vendors"] },
];

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
  const [stats, auctionsAll, candidates, latest, colDistressed, colEquity, colInstitutions, sentDigests, publishedArticles] =
    await Promise.all([
      homeStats(),
      auctionStats(),
      leadCandidates(),
      // Over-fetch so the diversity cap still fills the rails.
      latestRecorded(20),
      channelColumn(["distressed", "private_credit"], 12),
      channelColumn(["pe", "vc_founders"], 12),
      channelColumn(["lp_institutional", "vendors"], 12),
      db
        .select({ digestDate: digests.digestDate })
        .from(digests)
        .where(eq(digests.status, "sent"))
        .orderBy(desc(digests.digestDate))
        .limit(1),
      listPublishedArticles(20),
    ]);
  const upcoming = await listAuctions("upcoming");
  const nextAuctions = upcoming.rows.slice(0, 5);

  // Lead rotation (anti-skew): don't repeat yesterday's lead country when an
  // alternative exists. "Yesterday's lead" = the newest article published on
  // an earlier calendar day than the newest one.
  const newestDay = publishedArticles[0]?.publishedAt?.toISOString().slice(0, 10) ?? null;
  const previousLead = publishedArticles.find(
    (article) =>
      article.publishedAt !== null &&
      newestDay !== null &&
      article.publishedAt.toISOString().slice(0, 10) < newestDay,
  );
  const leadIndex = pickRotatedLead(
    publishedArticles,
    previousLead?.entityCountry ?? null,
    (article) => article.entityCountry,
  );
  const leadArticle = publishedArticles[leadIndex] ?? null;
  const factLead = leadArticle === null ? rankLead(candidates) : null;
  const latestRail = diversifyRail(
    latest.filter((item) => item.id !== factLead?.id),
    8,
    (item) => item.entityCountry,
  );
  const latestDigest = sentDigests[0]?.digestDate ?? null;

  const sections = visibleHomeSections({
    lead: leadArticle !== null || factLead !== null,
    latestCount: latestRail.length,
    channelColumnCounts: [colDistressed.length, colEquity.length, colInstitutions.length],
    auctionsCount: nextAuctions.length,
    hasDigest: latestDigest !== null,
  });
  const show = (key: string) => sections.includes(key);

  // Channel rails: article headlines (serif) above wire fact-lines (sans),
  // both passed through the anti-skew diversity cap.
  const railArticles = publishedArticles.filter((article) => article.id !== leadArticle?.id);
  const articlesFor = (channels: string[]): ArticleListItem[] =>
    diversifyRail(
      railArticles.filter((article) => article.channels.some((c) => channels.includes(c))),
      2,
      (article) => article.entityCountry,
    );
  const diverseItems = (items: FeedItem[]): FeedItem[] =>
    diversifyRail(items, 5, (item) => item.entityCountry);

  const channelColumns: { title: string; items: FeedItem[]; articles: ArticleListItem[] }[] = [
    { ...CHANNEL_GROUPS[0]!, items: diverseItems(colDistressed), articles: articlesFor(CHANNEL_GROUPS[0]!.channels) },
    { ...CHANNEL_GROUPS[1]!, items: diverseItems(colEquity), articles: articlesFor(CHANNEL_GROUPS[1]!.channels) },
    { ...CHANNEL_GROUPS[2]!, items: diverseItems(colInstitutions), articles: articlesFor(CHANNEL_GROUPS[2]!.channels) },
  ].filter((column) => column.items.length > 0 || column.articles.length > 0);

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
          {show("lead") && leadArticle !== null ? (
            <article className="flex flex-wrap items-start gap-6">
              <div className="min-w-0 flex-1">
                <p className="type-label">Lead</p>
                <Link href={`/news/${leadArticle.slug}`} className="hover:text-accent">
                  <h1 className="mt-2 max-w-2xl font-serif text-[38px] font-medium leading-[1.12]">
                    {leadArticle.headline}
                  </h1>
                </Link>
                {leadArticle.deck !== null ? (
                  <p className="mt-3 max-w-xl text-[15px] leading-[1.5] text-ink-secondary">
                    {leadArticle.deck}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="type-data text-ink-muted">
                    {leadArticle.byline}
                    {leadArticle.publishedAt !== null
                      ? ` · ${leadArticle.publishedAt.toISOString().slice(0, 10)}`
                      : ""}
                  </span>
                  {leadArticle.channels.map((channel) => (
                    <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
                      {channel}
                    </Tag>
                  ))}
                </div>
              </div>
              {leadArticle.entityName !== null ? (
                <div className="w-[150px] shrink-0 border border-line p-3">
                  <EntityLogo
                    name={leadArticle.entityName}
                    logoUrl={leadArticle.logoUrl}
                    size="md"
                  />
                  <p className="mt-2 text-[13px] font-medium leading-snug">
                    {leadArticle.entityName}
                  </p>
                  {leadArticle.entityCountry !== null ? (
                    <p className="type-small text-ink-muted">
                      {countryName(leadArticle.entityCountry)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ) : show("lead") && factLead !== null ? (
            <article>
              <p className="type-label">Lead</p>
              {factLead.entityHref !== null ? (
                <Link href={factLead.entityHref} className="hover:text-accent">
                  <h1 className="type-h1 mt-2 max-w-xl">{factLead.title}</h1>
                </Link>
              ) : (
                <h1 className="type-h1 mt-2 max-w-xl">{factLead.title}</h1>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="type-data text-ink-muted">{factLead.occurredOn}</span>
                <span className="text-[13px] text-ink-secondary">
                  {factLead.entityName}
                  {factLead.entityCountry !== null ? ` · ${countryName(factLead.entityCountry)}` : ""}
                </span>
                {factLead.channels.map((channel) => (
                  <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
                    {channel}
                  </Tag>
                ))}
              </div>
              {factLead.excerpt !== null && factLead.excerpt !== "" ? (
                <blockquote className="type-small mt-4 max-w-xl border-l-2 border-line-strong pl-3 text-ink-secondary">
                  “{factLead.excerpt}”
                </blockquote>
              ) : null}
              {factLead.sourceName !== null ? (
                <p className="type-small mt-3 text-ink-muted">
                  Source:{" "}
                  {factLead.sourceUrl !== null ? (
                    <a
                      href={factLead.sourceUrl}
                      rel="noopener noreferrer"
                      className="underline decoration-line-strong underline-offset-2 hover:text-accent"
                    >
                      {factLead.sourceName}
                    </a>
                  ) : (
                    factLead.sourceName
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
                    {column.articles.map((article) => (
                      <div key={article.id} className="border-t border-line py-2.5">
                        <Link
                          href={`/news/${article.slug}`}
                          className="font-serif text-[17px] font-medium leading-[1.25] text-ink hover:text-accent"
                        >
                          {article.headline}
                        </Link>
                        <p className="type-small mt-0.5 text-ink-muted">
                          {article.byline}
                          {article.entityCountry !== null
                            ? ` · ${countryName(article.entityCountry)}`
                            : ""}
                        </p>
                      </div>
                    ))}
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
              All signals →
            </Link>
          </aside>
        ) : null}
      </div>

      {/* 4 · Bottom band — map teaser · digest · reports promo. */}
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

      {/* Subscribe — inline and quiet, part of the bottom band. */}
      <section className="mt-8 max-w-xl">
        <SubscribeBlock compact />
      </section>

      {/* 5 · Auctions — demoted to the bottom quiet band. */}
      {show("auctions-rail") ? (
        <section className="mt-8 border-t border-line pt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="type-label text-ink-muted">Next auctions</h2>
            <Link href="/auctions" className="type-small text-ink-muted hover:text-accent">
              Auction tracker →
            </Link>
          </div>
          <div className="mt-1 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-5">
            {nextAuctions.map((row) => (
              <div key={row.factId} className="py-1.5">
                <p className="type-small text-ink-muted">
                  <span className="type-data">{row.saleDate}</span> ·{" "}
                  {row.daysUntil === 0
                    ? "today"
                    : `in ${row.daysUntil} day${row.daysUntil === 1 ? "" : "s"}`}
                </p>
                {row.debtorHref !== null ? (
                  <Link
                    href={row.debtorHref}
                    className="block truncate text-[13px] text-ink-secondary hover:text-accent"
                  >
                    {row.debtorName}
                  </Link>
                ) : (
                  <span className="block truncate text-[13px] text-ink-secondary">
                    {row.debtorName}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

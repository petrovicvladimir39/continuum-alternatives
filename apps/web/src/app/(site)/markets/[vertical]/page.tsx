import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  assetClassBySlug,
  CLASS_LEVEL,
  diversifyRail,
  meetsCoverageThreshold,
  parseAsOf,
  strategyBySlug,
  verticalBySlug,
  VERTICALS,
} from "@continuum/shared";
import {
  administratorRanking,
  courtRanking,
  listAskFeed,
  listAuctions,
  listPublishedArticles,
  strategyCoverage,
  topEntitiesForClassification,
  topEntitiesForVertical,
  type FeedItem,
  type RankingRow,
} from "@continuum/db";
import { EntityLogo } from "@/components/ui/entity-logo";
import { ClassKicker, ClassTopRule } from "@/components/editorial/class-accent";
import { SubscribeBlock } from "@/components/subscribe-block";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS, countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

/**
 * Market fronts (Phase 25C): one per vertical, config-driven from
 * @continuum/shared VERTICALS. Country-diversity rules apply to every rail;
 * empty modules are hidden — nothing renders a hollow box.
 */

export function generateStaticParams(): { vertical: string }[] {
  return VERTICALS.map((v) => ({ vertical: v.slug }));
}

/**
 * Taxonomy-front resolution (Phase 26C): slugs that are not curated
 * verticals resolve against the taxonomy (strategy slug, or class slug for
 * class-level fronts) and render the generic front ONLY when coverage
 * clears the threshold — never below it.
 */
async function resolveTaxonomyFront(slug: string): Promise<{
  label: string;
  scope: string;
  assetClass: string;
  strategies: string[] | null;
} | null> {
  const strategyHit = strategyBySlug(slug);
  const classHit = strategyHit === null ? assetClassBySlug(slug) : null;
  if (strategyHit === null && classHit === null) {
    return null;
  }
  const coverage = await strategyCoverage();
  if (strategyHit !== null) {
    const row = coverage.find(
      (c) => c.assetClass === strategyHit.assetClass.slug && c.strategy === strategyHit.strategy.slug,
    );
    if (row === undefined || !meetsCoverageThreshold(row)) {
      return null;
    }
    return {
      label: `${strategyHit.assetClass.label} · ${strategyHit.strategy.label}`,
      scope: `${strategyHit.strategy.label} coverage within ${strategyHit.assetClass.label} — classified entities and their sourced record.`,
      assetClass: strategyHit.assetClass.slug,
      strategies: [strategyHit.strategy.slug],
    };
  }
  const row = coverage.find((c) => c.assetClass === classHit!.slug && c.strategy === CLASS_LEVEL);
  if (row === undefined || !meetsCoverageThreshold(row)) {
    return null;
  }
  return {
    label: classHit!.label,
    scope: `${classHit!.label} across Europe — classified entities and their sourced record.`,
    assetClass: classHit!.slug,
    strategies: null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string }>;
}): Promise<Metadata> {
  const { vertical: slug } = await params;
  const vertical = verticalBySlug(slug);
  if (vertical !== null) {
    return {
      title: vertical.label,
      description: `${vertical.scope} Live coverage from Continuum Alternatives — the map of European alternative assets.`,
    };
  }
  const taxonomyFront = await resolveTaxonomyFront(slug);
  if (taxonomyFront !== null) {
    return { title: taxonomyFront.label, description: taxonomyFront.scope };
  }
  return { title: "Markets" };
}

function WireRow({ item }: { item: FeedItem }) {
  return (
    <div className="border-t border-line py-2.5">
      <span className="type-data text-ink-muted">{item.occurredOn}</span>{" "}
      {item.entityHref !== null ? (
        <Link href={item.entityHref} className="text-[13px] font-medium hover:text-accent">
          {item.title}
        </Link>
      ) : (
        <span className="text-[13px] font-medium">{item.title}</span>
      )}
      <p className="type-small mt-0.5 text-ink-muted">
        {item.entityName}
        {item.entityCountry !== null ? ` · ${countryName(item.entityCountry)}` : ""}
      </p>
    </div>
  );
}

function RankingTable({ title, rows }: { title: string; rows: RankingRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <section className="mt-8">
      <h2 className="type-label">{title}</h2>
      <table className="mt-2 w-full text-[13px]">
        <tbody>
          {rows.slice(0, 8).map((row, index) => (
            <tr key={row.label} className="border-t border-line">
              <td className="type-data w-[30px] py-1.5">{index + 1}</td>
              <td>{row.label}</td>
              <td className="type-data text-right">{row.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function MarketFrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ vertical: string }>;
  searchParams: Promise<{ asof?: string }>;
}) {
  const { vertical: slug } = await params;
  // Phase 34A: market fronts ACCEPT ?asof (no date control here — the
  // control lives on timelines and /rankings; deep links still work).
  // Articles are editorial and never time-travel.
  const asof = parseAsOf((await searchParams).asof, new Date().toISOString().slice(0, 10)) ?? undefined;
  let vertical = verticalBySlug(slug);
  if (vertical === null) {
    // Coverage-gated taxonomy front (26C): renders only above threshold.
    const taxonomyFront = await resolveTaxonomyFront(slug);
    if (taxonomyFront === null) {
      notFound();
    }
    vertical = {
      slug,
      label: taxonomyFront.label,
      scope: taxonomyFront.scope,
      channels: [],
      tags: [],
      factTypes: [],
      modules: [],
      taxonomy: { assetClass: taxonomyFront.assetClass, strategies: taxonomyFront.strategies },
    };
  }

  // Classification drives entity rows where a taxonomy mapping exists
  // (falling back to tags while classified coverage is thin); the LP &
  // Vendors fronts stay channel/tag-driven by design.
  const [articles, feed, classifiedEntities, taggedEntities] = await Promise.all([
    listPublishedArticles(20),
    vertical.channels.length > 0
      ? listAskFeed({ channels: vertical.channels, limit: 24, ...(asof !== undefined ? { asof } : {}) })
      : listAskFeed({
          assetClasses: vertical.taxonomy?.strategies == null ? [vertical.taxonomy!.assetClass] : [],
          strategies: vertical.taxonomy?.strategies ?? [],
          limit: 24,
          ...(asof !== undefined ? { asof } : {}),
        }),
    vertical.taxonomy !== undefined
      ? topEntitiesForClassification(vertical.taxonomy.assetClass, vertical.taxonomy.strategies, 8)
      : Promise.resolve([]),
    vertical.tags.length > 0 ? topEntitiesForVertical(vertical.tags, 8) : Promise.resolve([]),
  ]);
  const topEntities = classifiedEntities.length > 0 ? classifiedEntities : taggedEntities;
  const verticalArticles = articles.filter((article) =>
    article.channels.some((channel) => vertical.channels.includes(channel)),
  );
  const lead = verticalArticles[0] ?? null;
  const rail = diversifyRail(
    feed.items,
    8,
    (item) => item.entityCountry,
  );

  // Vertical modules — each hidden when empty.
  const wantsAuctions = vertical.modules.includes("auctions");
  const wantsCourts = vertical.modules.includes("court_rankings");
  const wantsDeals = vertical.modules.includes("latest_deals") || vertical.modules.includes("fund_closes");
  const wantsAdvisors = vertical.modules.includes("advisor_league");
  const [auctions, courts, typedFeed, advisors] = await Promise.all([
    wantsAuctions ? listAuctions("upcoming") : Promise.resolve(null),
    wantsCourts ? courtRanking(8, undefined, asof) : Promise.resolve([]),
    wantsDeals && vertical.factTypes.length > 0
      ? listAskFeed({ factTypes: vertical.factTypes, limit: 12, ...(asof !== undefined ? { asof } : {}) })
      : Promise.resolve(null),
    wantsAdvisors ? administratorRanking(8, undefined, asof) : Promise.resolve([]),
  ]);
  const typedRail =
    typedFeed === null ? [] : diversifyRail(typedFeed.items, 6, (item) => item.entityCountry);
  const nextAuctions = auctions === null ? [] : auctions.rows.slice(0, 5);

  return (
    <div className="py-10">
      <h1 className="font-serif text-[32px] font-medium leading-[1.15] text-ink">{vertical.label}</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-[1.5] text-ink-secondary">{vertical.scope}</p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {lead !== null ? (
            <article>
              <ClassTopRule assetClass={lead.assetClass} />
              <div className="mt-2 flex items-baseline gap-3">
                <p className="type-label">Lead</p>
                <ClassKicker assetClass={lead.assetClass} strategy={lead.strategy} />
              </div>
              <Link href={`/news/${lead.slug}`} className="hover:text-accent">
                <h2 className="mt-2 max-w-xl font-serif text-[26px] font-medium leading-[1.2]">
                  {lead.headline}
                </h2>
              </Link>
              {lead.deck !== null ? (
                <p className="mt-2 max-w-xl text-[14px] leading-[1.5] text-ink-secondary">{lead.deck}</p>
              ) : null}
              <p className="type-data mt-2 text-ink-muted">
                {lead.byline}
                {lead.publishedAt !== null ? ` · ${lead.publishedAt.toISOString().slice(0, 10)}` : ""}
              </p>
            </article>
          ) : null}

          {typedRail.length > 0 ? (
            <section className={lead !== null ? "mt-8 border-t border-line pt-5" : ""}>
              <h2 className="type-label">
                {vertical.slug === "lps-institutions" ? "Fund closes" : "Latest activity"}
              </h2>
              <div className="mt-1">
                {typedRail.map((item) => (
                  <WireRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {wantsAuctions && nextAuctions.length > 0 ? (
            <section className="mt-8 border-t border-line pt-5">
              <div className="flex items-baseline justify-between">
                <h2 className="type-label">Upcoming auctions</h2>
                <Link href="/auctions" className="type-small text-accent hover:underline">
                  Auction tracker →
                </Link>
              </div>
              <div className="mt-1">
                {nextAuctions.map((row) => (
                  <div key={row.factId} className="border-t border-line py-2">
                    <span className="type-data text-ink-muted">{row.saleDate}</span>{" "}
                    {row.debtorHref !== null ? (
                      <Link href={row.debtorHref} className="text-[13px] font-medium hover:text-accent">
                        {row.debtorName}
                      </Link>
                    ) : (
                      <span className="text-[13px] font-medium">{row.debtorName}</span>
                    )}
                    {row.place !== null ? (
                      <span className="type-small text-ink-muted"> · {row.place}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <RankingTable title="Most active courts" rows={wantsCourts ? courts : []} />
          <RankingTable title="Busiest administrators" rows={wantsAdvisors ? advisors : []} />

          {vertical.modules.includes("directory_link") ? (
            <p className="mt-6 text-[13px]">
              <Link
                href={`/companies?tag=${vertical.tags[0]}`}
                className="text-accent hover:underline"
              >
                Full {vertical.label.toLowerCase()} directory →
              </Link>
            </p>
          ) : null}
          {vertical.modules.includes("institutions_list") && topEntities.length > 0 ? (
            <p className="mt-6 text-[13px]">
              <Link href={`/companies?tag=${vertical.tags[0]}`} className="text-accent hover:underline">
                All institutions →
              </Link>
            </p>
          ) : null}

          <div className="mt-10 max-w-xl">
            <SubscribeBlock compact defaultChannels={vertical.channels} />
          </div>
        </div>

        <aside>
          {rail.length > 0 ? (
            <>
              <h2 className="type-label">Latest</h2>
              <div className="mt-1">
                {rail.map((item) => (
                  <WireRow key={item.id} item={item} />
                ))}
              </div>
            </>
          ) : null}

          {topEntities.length > 0 ? (
            <section className={rail.length > 0 ? "mt-8" : ""}>
              <h2 className="type-label">Most active</h2>
              <div className="mt-2 space-y-2.5">
                {topEntities.map((entity) => (
                  <div key={entity.slug} className="flex items-center gap-2.5">
                    <EntityLogo name={entity.name} logoUrl={entity.logoUrl} size="sm" />
                    <div className="min-w-0">
                      {entity.href !== null ? (
                        <Link
                          href={entity.href}
                          className="block truncate text-[13px] font-medium hover:text-accent"
                        >
                          {entity.name}
                        </Link>
                      ) : (
                        <span className="block truncate text-[13px] font-medium">{entity.name}</span>
                      )}
                      <span className="type-small text-ink-muted">
                        {entity.country !== null ? countryName(entity.country) : ""}
                        {entity.activity > 0 ? ` · ${entity.activity} records` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <p className="mt-8">
            <Tag variant={CHANNEL_TAG_VARIANTS[vertical.channels[0] ?? ""] ?? "neutral"}>
              {vertical.label}
            </Tag>
          </p>
        </aside>
      </div>
    </div>
  );
}

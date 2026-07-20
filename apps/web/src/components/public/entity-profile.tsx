import Link from "next/link";
import { orgEnrichmentOf } from "@continuum/db";
import type { PublicConnection, PublicProfile, SimilarEntity } from "@continuum/db";
import { hasCyrillic, transliterateDisplay } from "@continuum/shared";
import { ConnectionsGraph } from "@/components/public/connections-graph";
import { EntityLogo } from "@/components/ui/entity-logo";
import { StatBlock } from "@/components/ui/stat-block";
import { Tag } from "@/components/ui/tag";
import {
  CHANNEL_TAG_VARIANTS,
  countryName,
  DEAL_TYPE_LABELS,
  formatAmount,
  KIND_LABELS,
  KIND_LABELS_ANY,
} from "@/lib/public-labels";

function groupConnections(connections: PublicConnection[]): [string, PublicConnection[]][] {
  const groups = new Map<string, PublicConnection[]>();
  for (const connection of connections) {
    const list = groups.get(connection.phrase) ?? [];
    list.push(connection);
    groups.set(connection.phrase, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function ProfileStats({ profile }: { profile: PublicProfile }) {
  const { entity, deal, fund, dealAmountRaw, factSplit, organization } = profile;
  const blocks: { value: string; label: string }[] = [];
  const enrichment = orgEnrichmentOf(organization?.enrichment ?? null);

  // Shared institutional row — every kind.
  blocks.push({ value: String(profile.factsCount), label: "Recorded facts" });
  blocks.push({ value: String(profile.connectionsCount), label: "Connections" });

  // Reviewer-approved enrichment fields (never rendered pre-approval).
  if (organization?.foundedYear != null) {
    blocks.push({ value: String(organization.foundedYear), label: "Founded" });
  }
  if (typeof enrichment?.approved.hq_address === "string") {
    blocks.push({ value: enrichment.approved.hq_address, label: "HQ address" });
  }
  if (typeof enrichment?.approved.aum_text === "string") {
    blocks.push({ value: enrichment.approved.aum_text, label: "AUM (as stated)" });
  }
  if (typeof enrichment?.approved.team_size_text === "string") {
    blocks.push({ value: enrichment.approved.team_size_text, label: "Team (as stated)" });
  }
  if (profile.counterpartiesCount > 0) {
    blocks.push({ value: String(profile.counterpartiesCount), label: "Counterparties" });
  }
  if (profile.firstSeenYear !== null) {
    blocks.push({ value: String(profile.firstSeenYear), label: "First seen" });
  }
  if (profile.latestActivityOn !== null) {
    blocks.push({ value: profile.latestActivityOn, label: "Latest activity" });
  }
  if (factSplit.distressed > 0) {
    blocks.push({ value: String(factSplit.distressed), label: "Distressed facts" });
  }
  if (factSplit.credit > 0) {
    blocks.push({ value: String(factSplit.credit), label: "Credit facts" });
  }
  if (factSplit.equity > 0) {
    blocks.push({ value: String(factSplit.equity), label: "Equity facts" });
  }

  if (entity.kind === "deal" && deal !== null) {
    // Stored numerics only; raw extracted text verbatim when unparsed. Never computed.
    if (deal.amount !== null) {
      blocks.push({ value: formatAmount(deal.amount, deal.currency), label: "Amount" });
    } else if (dealAmountRaw !== null) {
      blocks.push({ value: dealAmountRaw, label: "Amount (as reported)" });
    }
    blocks.push({ value: DEAL_TYPE_LABELS[deal.dealType] ?? deal.dealType, label: "Deal type" });
    if (deal.announcedOn !== null) {
      blocks.push({ value: deal.announcedOn, label: "Announced" });
    }
  } else if (entity.kind === "fund_vehicle" && fund !== null) {
    if (fund.vintageYear !== null) {
      blocks.push({ value: String(fund.vintageYear), label: "Vintage" });
    }
    if (fund.targetSize !== null) {
      blocks.push({ value: formatAmount(fund.targetSize, fund.currency), label: "Target size" });
    }
    if (fund.strategy !== null) {
      blocks.push({ value: fund.strategy.replaceAll("_", " "), label: "Strategy" });
    }
  }

  const managerBlock =
    entity.kind === "fund_vehicle" && fund !== null && fund.managerName !== null ? (
      <div>
        <div className="text-[22px] leading-[1.2] font-medium">
          {fund.managerHref !== null ? (
            <Link href={fund.managerHref} className="hover:text-accent">
              {fund.managerName}
            </Link>
          ) : (
            fund.managerName
          )}
        </div>
        <div className="type-label mt-1">Manager</div>
      </div>
    ) : null;

  return (
    <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
      {managerBlock}
      {blocks.map((block) => (
        <StatBlock key={block.label} value={block.value} label={block.label} />
      ))}
    </div>
  );
}

function Citation({ citation }: { citation: PublicProfile["facts"][number]["citation"] }) {
  // Citations are the credibility spine — the line renders for every fact.
  if (citation === null) {
    return <p className="type-small mt-1 text-ink-muted">Source: internal record</p>;
  }
  const label = citation.sourceName ?? citation.documentTitle ?? "Source document";
  return (
    <p className="type-small mt-1 text-ink-muted">
      Source:{" "}
      {citation.url !== null ? (
        <a
          href={citation.url}
          rel="noopener noreferrer"
          className="underline decoration-line-strong underline-offset-2 hover:text-accent"
        >
          {label}
        </a>
      ) : (
        label
      )}
    </p>
  );
}

/** Chronological facts grouped by year on a vertical rail. */
function ActivityTimeline({ facts }: { facts: PublicProfile["facts"] }) {
  const byYear = new Map<string, PublicProfile["facts"]>();
  for (const fact of facts) {
    const year = fact.occurredOn.slice(0, 4);
    const list = byYear.get(year) ?? [];
    list.push(fact);
    byYear.set(year, list);
  }
  return (
    <div className="mt-4">
      {[...byYear.entries()].map(([year, yearFacts]) => (
        <div key={year} className="mb-2">
          <h3 className="font-serif text-[18px] leading-[1.25] font-medium">{year}</h3>
          <div className="mt-2 border-l border-line-strong">
            {yearFacts.map((fact) => (
              <div key={fact.id} className="relative pb-5 pl-6">
                <span className="absolute top-[5px] -left-[4.5px] h-2 w-2 rounded-full border border-surface bg-ink-muted" />
                <div className="type-data text-ink-muted">{fact.occurredOn}</div>
                <h4 className="type-h3 mt-0.5">{fact.title}</h4>
                {fact.body !== null && fact.body !== "" ? (
                  <p className="type-small mt-1 max-w-2xl text-ink-secondary">{fact.body}</p>
                ) : null}
                {fact.channels.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {fact.channels.map((channel) => (
                      <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
                        {channel}
                      </Tag>
                    ))}
                  </div>
                ) : null}
                <Citation citation={fact.citation} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntityProfile({
  profile,
  similar,
}: {
  profile: PublicProfile;
  similar: SimilarEntity[];
}) {
  const { entity, tags, facts, connections, organization, mentions } = profile;
  const kindLabel = KIND_LABELS[entity.kind as keyof typeof KIND_LABELS] ?? entity.kind;
  const country = countryName(entity.country);
  const connectionGroups = groupConnections(connections);
  const website = organization?.website ?? null;
  const websiteHost = website !== null ? website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "") : null;

  return (
    <article className="py-10">
      <header className="flex items-start gap-4">
        <EntityLogo
          name={entity.name}
          logoUrl={organization?.logoUrl ?? null}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="type-h1">{entity.name}</h1>
          {hasCyrillic(entity.name) ? (
            <p className="type-small mt-1 text-ink-muted">{transliterateDisplay(entity.name)}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="type-label">{kindLabel}</span>
            {country !== null ? (
              <>
                <span className="text-ink-muted">·</span>
                <span className="type-label">{country}</span>
              </>
            ) : null}
            {organization?.hqCity ? (
              <>
                <span className="text-ink-muted">·</span>
                <span className="type-label">{organization.hqCity}</span>
              </>
            ) : null}
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {websiteHost !== null && website !== null ? (
              <a
                href={website}
                rel="noopener noreferrer"
                className="type-small text-accent underline decoration-line-strong underline-offset-2 hover:decoration-accent"
              >
                {websiteHost} ↗
              </a>
            ) : null}
          </div>
          {entity.summary !== null && entity.summary !== "" ? (
            <p className="mt-3 max-w-2xl text-ink-secondary">{entity.summary}</p>
          ) : null}
        </div>
      </header>

      {/* ── COMPANY OVERVIEW — AI enrichment (Phase 17). The overview is the
          one generated field; it publishes because it is labeled and carries
          its source links. Factual fields render only post-approval, in the
          stat band below. */}
      {(() => {
        const enrichment = orgEnrichmentOf(organization?.enrichment ?? null);
        if (enrichment === null) {
          return null;
        }
        return (
          <section className="mt-8 max-w-2xl">
            <h2 className="type-label">Company overview</h2>
            <p className="mt-2 text-[14px] leading-[1.55] text-ink">{enrichment.overview_en}</p>
            {enrichment.strategy_focus.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {enrichment.strategy_focus.map((focus) => (
                  <Tag key={focus}>{focus}</Tag>
                ))}
              </div>
            ) : null}
            <p className="type-small mt-2 text-ink-muted">
              From the company&apos;s website
              {enrichment.source_urls.map((url, i) => (
                <span key={url}>
                  {i === 0 ? ": " : ", "}
                  <a
                    href={url}
                    rel="noopener noreferrer"
                    className="underline decoration-line-strong underline-offset-2 hover:text-accent"
                  >
                    {url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                  </a>
                </span>
              ))}
            </p>
          </section>
        );
      })()}

      <ProfileStats profile={profile} />

      {connections.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Connections graph</h2>
          <div className="mt-4 rounded-md border border-line bg-surface p-4">
            <ConnectionsGraph entityName={entity.name} connections={connections} />
          </div>
        </section>
      ) : null}

      {facts.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Activity</h2>
          <ActivityTimeline facts={facts} />
        </section>
      ) : null}

      {connectionGroups.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Connections</h2>
          <div className="mt-4 space-y-5">
            {connectionGroups.map(([phrase, group]) => (
              <div key={phrase} className="border-t border-line pt-3">
                <h3 className="type-label">{phrase}</h3>
                <ul className="mt-2 space-y-1">
                  {group.map((connection) => (
                    <li key={connection.id} className="type-small">
                      {connection.counterpartHref !== null ? (
                        <Link href={connection.counterpartHref} className="hover:text-accent">
                          {connection.counterpartName}
                        </Link>
                      ) : (
                        <span>{connection.counterpartName}</span>
                      )}
                      {connection.role !== null ? (
                        <span className="text-ink-muted"> — {connection.role}</span>
                      ) : null}
                      {connection.startedOn !== null ? (
                        <span className="type-data text-ink-muted"> · {connection.startedOn}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {mentions.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Mentions &amp; sources</h2>
          <div className="mt-4">
            {mentions.map((mention, index) => (
              <div
                key={index}
                className="flex items-baseline gap-3 border-t border-line py-2.5 text-[13px]"
              >
                <span className="type-data w-[88px] shrink-0 text-ink-muted">
                  {mention.date ?? "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{mention.sourceName ?? "Source document"}</span>
                  {mention.title !== null ? (
                    <span className="text-ink-secondary"> — {mention.title}</span>
                  ) : null}
                </span>
                {mention.url !== null ? (
                  <a
                    href={mention.url}
                    rel="noopener noreferrer"
                    className="shrink-0 text-accent underline decoration-line-strong underline-offset-2 hover:decoration-accent"
                  >
                    open ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {similar.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Related</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((hit) => (
              <div key={hit.id} className="rounded-md border border-line bg-surface p-3">
                {hit.href !== null ? (
                  <Link href={hit.href} className="type-h3 hover:text-accent">
                    {hit.name}
                  </Link>
                ) : (
                  <span className="type-h3">{hit.name}</span>
                )}
                <p className="type-small mt-1 text-ink-muted">
                  {KIND_LABELS_ANY[hit.kind] ?? hit.kind}
                  {hit.country !== null ? ` · ${countryName(hit.country)}` : ""}
                </p>
                {hit.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {hit.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  EDGE_TYPE_GROUPS,
  getMemberByClerkId,
  listClassificationsForEntity,
  orgEnrichmentOf,
  resolveMemberTier,
} from "@continuum/db";
import type { PublicConnection, PublicProfile, SimilarEntity } from "@continuum/db";
import {
  canGenerateBrief,
  classifiedLabel,
  hasCyrillic,
  strategyBySlug,
  transliterateDisplay,
} from "@continuum/shared";
import { ConnectionsFlow, type FlowCounterparty } from "@/components/redesign/connections-flow";
import { ActivityChart, type QuarterCount } from "@/components/redesign/activity-chart";
import { ActivityTimeline, type TimelineFact } from "@/components/redesign/activity-timeline";
import { AnimatedStatBand, type StatItem } from "@/components/redesign/stat-band";
import { RelatedCards, type RelatedHit } from "@/components/redesign/related-cards";
import { Reveal } from "@/components/redesign/motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DiscussionSection } from "@/components/discussion-section";
import { OrgStewardSection } from "@/components/org-steward";
import { AsOfBanner, AsOfControl } from "@/components/asof-control";
import { EntityLogo } from "@/components/ui/entity-logo";
import { TrackView } from "@/components/track-view";
import { WatchBand } from "@/components/watch-band";
import { Tag } from "@/components/ui/tag";
import {
  CHANNEL_TAG_VARIANTS,
  countryName,
  DEAL_TYPE_LABELS,
  formatAmount,
  KIND_LABELS,
  KIND_LABELS_ANY,
} from "@/lib/public-labels";

/**
 * FLAGSHIP REDESIGN (branch redesign-flagship). Hybrid law:
 * - the RECORD core (name, timeline, citations, facts) stays editorial —
 *   Newsreader serif heads, dense, every fact cited;
 * - the SHELL and VISUALS take shadcn structure + React Flow + restrained
 *   framer-motion. Data and server logic are unchanged — visual rebuild only.
 */

function groupConnections(connections: PublicConnection[]): [string, PublicConnection[]][] {
  const groups = new Map<string, PublicConnection[]>();
  for (const connection of connections) {
    const list = groups.get(connection.phrase) ?? [];
    list.push(connection);
    groups.set(connection.phrase, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Server-side reduction of connections into graph counterparties. */
function toCounterparties(connections: PublicConnection[]): FlowCounterparty[] {
  const byName = new Map<string, FlowCounterparty>();
  for (const connection of connections) {
    const existing = byName.get(connection.counterpartName);
    if (existing === undefined) {
      byName.set(connection.counterpartName, {
        name: connection.counterpartName,
        href: connection.counterpartHref,
        count: 1,
        phrases: [connection.phrase],
        group: EDGE_TYPE_GROUPS[connection.edgeType],
      });
    } else {
      existing.count += 1;
      if (!existing.phrases.includes(connection.phrase)) {
        existing.phrases.push(connection.phrase);
      }
    }
  }
  return [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function toQuarterCounts(facts: PublicProfile["facts"]): QuarterCount[] {
  const byQuarter = new Map<string, number>();
  for (const fact of facts) {
    const year = fact.occurredOn.slice(0, 4);
    const month = Number(fact.occurredOn.slice(5, 7));
    const quarter = `${year} Q${Math.floor((month - 1) / 3) + 1}`;
    byQuarter.set(quarter, (byQuarter.get(quarter) ?? 0) + 1);
  }
  return [...byQuarter.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, count]) => ({ quarter, count }));
}

function buildStatItems(profile: PublicProfile): StatItem[] {
  const { entity, deal, fund, dealAmountRaw, factSplit, organization } = profile;
  const blocks: StatItem[] = [];
  const enrichment = orgEnrichmentOf(organization?.enrichment ?? null);

  blocks.push({ value: String(profile.factsCount), label: "Recorded facts", countUp: true });
  blocks.push({ value: String(profile.connectionsCount), label: "Connections", countUp: true });
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
    blocks.push({ value: String(profile.counterpartiesCount), label: "Counterparties", countUp: true });
  }
  if (profile.firstSeenYear !== null) {
    blocks.push({ value: String(profile.firstSeenYear), label: "First seen" });
  }
  if (profile.latestActivityOn !== null) {
    blocks.push({ value: profile.latestActivityOn, label: "Latest activity" });
  }
  if (factSplit.distressed > 0) {
    blocks.push({ value: String(factSplit.distressed), label: "Distressed facts", countUp: true });
  }
  if (factSplit.credit > 0) {
    blocks.push({ value: String(factSplit.credit), label: "Credit facts", countUp: true });
  }
  if (factSplit.equity > 0) {
    blocks.push({ value: String(factSplit.equity), label: "Equity facts", countUp: true });
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
      const resolved = strategyBySlug(fund.strategy);
      blocks.push({
        value:
          resolved !== null
            ? `${resolved.assetClass.label} · ${resolved.strategy.label}`
            : fund.strategy.replaceAll("_", " "),
        label: "Strategy",
      });
    }
  }
  return blocks;
}

// Server-side copy: value exports from "use client" modules arrive as
// client-reference proxies in server components, so the legend lives here.
const GROUP_LEGEND = [
  { group: "equity", label: "Equity" },
  { group: "credit", label: "Credit" },
  { group: "distressed", label: "Distressed" },
  { group: "neutral", label: "Advisory / other" },
] as const;

/** Class-accent chip: platform palette on shadcn Badge structure. */
const CLASS_ACCENT_SLUGS = new Set([
  "private-equity",
  "private-credit",
  "real-assets",
  "hedge-funds",
  "structured",
  "esoteric",
  "collectibles",
  "climate",
  "digital",
]);

function ClassBadge({ assetClass, strategy }: { assetClass: string; strategy: string }) {
  const varName = CLASS_ACCENT_SLUGS.has(assetClass)
    ? `var(--color-class-${assetClass})`
    : "var(--color-ink-secondary)";
  return (
    <Badge
      variant="outline"
      className="rounded-sm bg-surface"
      style={{ borderColor: varName, color: varName }}
    >
      {classifiedLabel(assetClass, strategy)}
    </Badge>
  );
}

export async function EntityProfile({
  profile,
  similar,
  asof = null,
  basePath = "",
}: {
  profile: PublicProfile;
  similar: SimilarEntity[];
  /** Phase 34A — active as-of date; record sections reflect it, live
   * surfaces (watch, discussion, steward) deliberately do not. */
  asof?: string | null;
  basePath?: string;
}) {
  const { entity, tags, facts, connections, organization, mentions } = profile;
  const kindLabel = KIND_LABELS[entity.kind as keyof typeof KIND_LABELS] ?? entity.kind;
  const country = countryName(entity.country);
  const classifications = (await listClassificationsForEntity(entity.id)).filter(
    (c) => c.status === "approved",
  );
  const connectionGroups = groupConnections(connections);
  const counterparties = toCounterparties(connections);
  const quarterCounts = toQuarterCounts(facts);

  // Serializable facts for the client timeline island.
  const timelineFacts: TimelineFact[] = facts.map((fact) => ({
    id: fact.id,
    occurredOn: fact.occurredOn,
    title: fact.title,
    body: fact.body,
    channels: fact.channels,
    channelVariants: Object.fromEntries(
      fact.channels.map((channel) => [channel, CHANNEL_TAG_VARIANTS[channel] ?? "neutral"]),
    ),
    citation: fact.citation,
    contributedBy: fact.contributedBy,
  }));

  const relatedHits: RelatedHit[] = similar.map((hit) => ({
    id: hit.id,
    name: hit.name,
    href: hit.href,
    kindLabel: KIND_LABELS_ANY[hit.kind] ?? hit.kind,
    countryLabel: hit.country !== null ? countryName(hit.country) : null,
    tags: hit.tags,
  }));

  // Phase 29D: the brief affordance is FOUNDING-ONLY and org-only — free
  // and anonymous readers see nothing (no feature teasing on public pages).
  let briefHref: string | null = null;
  if (
    entity.kind === "organization" &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  ) {
    const { userId } = await auth();
    const member = userId === null ? null : await getMemberByClerkId(userId);
    if (member !== null && canGenerateBrief(await resolveMemberTier(member.id))) {
      briefHref = `/companies/${entity.slug}/brief`;
    }
  }
  const website = organization?.website ?? null;
  const websiteHost =
    website !== null ? website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "") : null;
  const enrichment = orgEnrichmentOf(organization?.enrichment ?? null);

  return (
    <article className="py-10">
      <TrackView event="entity_viewed" props={{ kind: entity.kind }} />
      {asof !== null && basePath !== "" ? (
        <div className="mb-6">
          <AsOfBanner asof={asof} basePath={basePath} />
        </div>
      ) : null}

      {/* ── 1 · HEADER BAND — the institutional masthead. */}
      <header className="border-b border-line pb-6">
        <div className="flex items-start gap-5">
          <EntityLogo name={entity.name} logoUrl={organization?.logoUrl ?? null} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[34px] leading-[1.15] font-medium">{entity.name}</h1>
            {hasCyrillic(entity.name) ? (
              <p className="type-small mt-1 text-ink-muted">{transliterateDisplay(entity.name)}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-sm">
                {kindLabel}
              </Badge>
              {country !== null ? (
                <span className="type-label">
                  {country}
                  {organization?.hqCity ? ` · ${organization.hqCity}` : ""}
                </span>
              ) : null}
              {classifications.map((c) => (
                <ClassBadge
                  key={`${c.assetClass}:${c.strategy}`}
                  assetClass={c.assetClass}
                  strategy={c.strategy}
                />
              ))}
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
              <WatchBand
                entityId={entity.id}
                backPath={`/${entity.kind === "organization" ? "companies" : entity.kind === "fund_vehicle" ? "funds" : "deals"}/${entity.slug}`}
              />
              {briefHref !== null ? (
                <Link href={briefHref} className="text-[13px] text-accent hover:underline">
                  Brief →
                </Link>
              ) : null}
            </div>
            {entity.summary !== null && entity.summary !== "" ? (
              <p className="mt-3 max-w-2xl text-ink-secondary">{entity.summary}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-6">
          <AnimatedStatBand items={buildStatItems(profile)} />
        </div>
      </header>

      {/* ── 2 · THE NETWORK GRAPH — centerpiece. */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="type-h2">Network</h2>
          <div className="flex flex-wrap gap-3">
            {GROUP_LEGEND.map(({ group, label }) => (
              <span key={group} className="type-small flex items-center gap-1.5 text-ink-muted">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background:
                      group === "neutral" ? "var(--color-ink-muted)" : `var(--color-${group})`,
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
        <Card className="mt-4 overflow-hidden rounded-md border border-line bg-surface p-0 ring-0">
          {counterparties.length > 0 ? (
            <ConnectionsFlow
              entityName={entity.name}
              logoUrl={organization?.logoUrl ?? null}
              counterparties={counterparties}
            />
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="font-serif text-[17px] text-ink-secondary">
                No connections on the public record yet.
              </p>
              <p className="type-small max-w-md text-ink-muted">
                Relationships appear here as edges are approved into the record — every line on
                this graph is a cited, reviewed connection.
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* ── 3 · ACTIVITY TIMELINE — the editorial record core. */}
      {facts.length > 0 || asof !== null ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="type-h2">Activity</h2>
            {basePath !== "" ? <AsOfControl basePath={basePath} asof={asof} /> : null}
          </div>
          {facts.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-muted">
              Nothing was on the record for this entity as of {asof}.
            </p>
          ) : (
            <ActivityTimeline facts={timelineFacts} />
          )}
        </section>
      ) : null}

      {/* ── 4 · COMPANY OVERVIEW — labeled + sourced enrichment. */}
      {enrichment !== null ? (
        <Reveal>
          <section className="mt-10">
            <h2 className="type-label">Company overview</h2>
            <Card
              size="sm"
              className="mt-2 max-w-2xl rounded-md border border-line bg-surface ring-0"
            >
              <div className="px-3">
                <p className="text-[14px] leading-[1.55] text-ink">{enrichment.overview_en}</p>
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
              </div>
            </Card>
          </section>
        </Reveal>
      ) : null}

      {/* ── Steward statement (Phase 33A) — the org's OWN words, always
          labeled as such; never merged into the record. */}
      {organization?.stewardStatement ? (
        <section className="mt-6 max-w-2xl border-l-2 border-line-strong pl-4">
          <h2 className="type-label">From {entity.name}</h2>
          <p className="mt-1.5 text-[14px] leading-[1.55] text-ink">
            {organization.stewardStatement}
          </p>
          <p className="type-small mt-1 text-ink-muted">
            The organization&apos;s own statement, provided by its verified steward.
          </p>
        </section>
      ) : null}

      {/* ── 5 · ACTIVITY CHART — facts per quarter, counts only, ≥4 facts. */}
      {facts.length >= 4 ? (
        <Reveal>
          <section className="mt-10">
            <h2 className="type-label">Recorded activity by quarter</h2>
            <div className="mt-3">
              <ActivityChart data={quarterCounts} />
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Phase 33A/B: claiming + steward tools + vendor track record. */}
      {entity.kind === "organization" ? (
        <OrgStewardSection
          entityId={entity.id}
          entityName={entity.name}
          backPath={`/companies/${entity.slug}`}
          stewardStatement={organization?.stewardStatement ?? null}
        />
      ) : null}

      {/* Phase 30C: the anchored signal thread — below the timeline. */}
      <DiscussionSection
        anchorKind="entity"
        anchorId={entity.id}
        backPath={`/${entity.kind === "organization" ? "companies" : entity.kind === "fund_vehicle" ? "funds" : "deals"}/${entity.slug}`}
      />

      {/* The citable textual connections list — the record beneath the graph. */}
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

      {/* ── 7 · MENTIONS & SOURCES. */}
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
                {/* Phase 34C: every mention row links its document page,
                    where members can ask the filing directly. */}
                <Link
                  href={`/documents/${mention.id}`}
                  className="shrink-0 text-[12px] text-ink-muted hover:text-accent"
                >
                  ask →
                </Link>
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

      {/* ── 6 · RELATED — logo-avatar cards, never-empty logic unchanged. */}
      {similar.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Related</h2>
          <RelatedCards hits={relatedHits} />
        </section>
      ) : null}
    </article>
  );
}

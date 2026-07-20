import Link from "next/link";
import type { PublicConnection, PublicProfile, SimilarEntity } from "@continuum/db";
import { hasCyrillic, transliterateDisplay } from "@continuum/shared";
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
  const { entity, deal, fund, dealAmountRaw } = profile;
  const blocks: { value: string; label: string }[] = [];

  if (entity.kind === "organization") {
    blocks.push({ value: String(profile.factsCount), label: "Recorded facts" });
    blocks.push({ value: String(profile.connectionsCount), label: "Connections" });
    if (profile.firstSeenYear !== null) {
      blocks.push({ value: String(profile.firstSeenYear), label: "First seen" });
    }
  } else if (entity.kind === "deal" && deal !== null) {
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

  if (blocks.length === 0 && managerBlock === null) {
    return null;
  }
  return (
    <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4 border-y border-line py-4">
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

export function EntityProfile({
  profile,
  similar,
}: {
  profile: PublicProfile;
  similar: SimilarEntity[];
}) {
  const { entity, tags, facts, connections } = profile;
  const kindLabel = KIND_LABELS[entity.kind as keyof typeof KIND_LABELS] ?? entity.kind;
  const country = countryName(entity.country);
  const connectionGroups = groupConnections(connections);

  return (
    <article className="py-10">
      <header>
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
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        {entity.summary !== null && entity.summary !== "" ? (
          <p className="mt-3 max-w-2xl text-ink-secondary">{entity.summary}</p>
        ) : null}
      </header>

      <ProfileStats profile={profile} />

      {facts.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Timeline</h2>
          <div className="mt-4">
            {facts.map((fact) => (
              <div key={fact.id} className="grid grid-cols-[110px_1fr] gap-4 border-t border-line py-4">
                <div className="type-data text-ink-muted">{fact.occurredOn}</div>
                <div>
                  <h3 className="type-h3">{fact.title}</h3>
                  {fact.body !== null && fact.body !== "" ? (
                    <p className="type-small mt-1 max-w-2xl text-ink-secondary">{fact.body}</p>
                  ) : null}
                  {fact.channels.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {fact.channels.map((channel) => (
                        <Tag key={channel} variant={CHANNEL_TAG_VARIANTS[channel] ?? "neutral"}>
                          {channel}
                        </Tag>
                      ))}
                    </div>
                  ) : null}
                  <Citation citation={fact.citation} />
                </div>
              </div>
            ))}
          </div>
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

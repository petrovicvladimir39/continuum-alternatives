import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CHANNELS } from "@continuum/shared";
import {
  feedFilterOptions,
  getMemberByClerkId,
  listFeed,
  memberReactionsFor,
  reactionCountsFor,
  type Reaction,
  type ReactionCounts,
} from "@continuum/db";
import { ReactionBand } from "@/components/reaction-band";
import { Tag } from "@/components/ui/tag";
import { CHANNEL_TAG_VARIANTS, countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  distressed: "Distressed",
  private_credit: "Private credit",
  vc_founders: "VC & founders",
  pe: "PE",
  lp_institutional: "LP",
  vendors: "Vendors",
};

type FeedSearchParams = { channel?: string; country?: string; type?: string; page?: string };

function feedHref(params: { channel?: string; country?: string; type?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.channel) {
    query.set("channel", params.channel);
  }
  if (params.country) {
    query.set("country", params.country);
  }
  if (params.type) {
    query.set("type", params.type);
  }
  if (params.page !== undefined && params.page > 1) {
    query.set("page", String(params.page));
  }
  const suffix = query.toString();
  return suffix === "" ? "/feed" : `/feed?${suffix}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const channel =
    params.channel !== undefined && (CHANNELS as readonly string[]).includes(params.channel)
      ? params.channel
      : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const label = channel !== undefined ? (CHANNEL_LABELS[channel] ?? channel) : null;
  return {
    title: label !== null ? `Feed — ${label}` : "Feed",
    description:
      label !== null
        ? `${label} events in Europe's alternative-asset record — approved, source-cited facts.`
        : "The live record of European alternative-asset events — insolvencies, asset sales, deals, and mandates, each with its source.",
    // Pagination pages beyond the first are noindex — the canonical surface is page 1.
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}) {
  const params = await searchParams;
  const channel =
    params.channel !== undefined && (CHANNELS as readonly string[]).includes(params.channel)
      ? params.channel
      : undefined;
  const country = params.country ?? "";
  const factType = params.type ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const [feed, options] = await Promise.all([
    listFeed({
      ...(channel !== undefined ? { channel } : {}),
      country,
      factType,
      page,
    }),
    feedFilterOptions(),
  ]);

  // Phase 30A: reactions — batched (one query per surface, no N+1).
  const factIds = feed.items.map((item) => item.id);
  const counts = await reactionCountsFor("fact", factIds);
  let ownReactions = new Map<string, Reaction>();
  let signedIn = false;
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    if (userId !== null) {
      const member = await getMemberByClerkId(userId);
      if (member !== null) {
        signedIn = true;
        ownReactions = await memberReactionsFor(member.id, "fact", factIds);
      }
    }
  }
  const emptyCounts: ReactionCounts = { credible: 0, doubtful: 0, watching: 0 };
  const backPath = feedHref({
    ...(channel !== undefined ? { channel } : {}),
    country,
    type: factType,
    page,
  });

  return (
    <div className="py-10">
      <h1 className="type-h1">Feed</h1>
      <p className="mt-2 max-w-2xl text-ink-secondary">
        Approved events across the record, newest first. Every item carries its source.
      </p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-line pb-2">
        <Link
          href={feedHref({ country, type: factType })}
          className={`px-2 py-1 text-[13px] ${channel === undefined ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}`}
        >
          All
        </Link>
        {CHANNELS.map((value) => (
          <Link
            key={value}
            href={feedHref({ channel: value, country, type: factType })}
            className={`px-2 py-1 text-[13px] ${channel === value ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"}`}
          >
            {CHANNEL_LABELS[value] ?? value}
          </Link>
        ))}
      </div>

      {/* Plain GET form — no client JS. */}
      <form action="/feed" method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {channel !== undefined ? <input type="hidden" name="channel" value={channel} /> : null}
        <label className="block">
          <span className="type-label">Country</span>
          <select
            name="country"
            defaultValue={country}
            className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]"
          >
            <option value="">All countries</option>
            {options.countries.map((code) => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="type-label">Type</span>
          <select
            name="type"
            defaultValue={factType}
            className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]"
          >
            <option value="">All types</option>
            {options.factTypes.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm border border-line-strong bg-surface px-4 py-1.5 text-[13px] font-medium hover:border-accent hover:text-accent"
        >
          Filter
        </button>
        {country !== "" || factType !== "" ? (
          <Link
            href={feedHref(channel !== undefined ? { channel } : {})}
            className="type-small text-ink-muted hover:text-accent"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {feed.items.length === 0 ? (
        <p className="mt-8 text-[13px] text-ink-secondary">
          No items yet in this channel — coverage expanding.
        </p>
      ) : (
        <div className="mt-6">
          {feed.items.map((item) => (
            <div key={item.id} className="border-t border-line py-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="type-data w-[88px] shrink-0 text-ink-muted">
                  {item.occurredOn}
                </span>
                <div className="min-w-0 flex-1">
                  {item.entityHref !== null ? (
                    <Link href={item.entityHref} className="type-h3 hover:text-accent">
                      {item.title}
                    </Link>
                  ) : (
                    <span className="type-h3">{item.title}</span>
                  )}
                  <p className="type-small mt-0.5 text-ink-secondary">
                    {item.entityName}
                    {item.entityCountry !== null ? ` · ${countryName(item.entityCountry)}` : ""}
                    {item.sourceName !== null ? (
                      <>
                        {" · "}
                        {item.sourceUrl !== null ? (
                          <a
                            href={item.sourceUrl}
                            rel="noopener noreferrer"
                            className="underline decoration-line-strong underline-offset-2 hover:text-accent"
                          >
                            {item.sourceName}
                          </a>
                        ) : (
                          item.sourceName
                        )}
                      </>
                    ) : null}
                  </p>
                  <div className="mt-1">
                    <ReactionBand
                      targetKind="fact"
                      targetId={item.id}
                      backPath={backPath}
                      counts={counts.get(item.id) ?? emptyCounts}
                      own={ownReactions.get(item.id) ?? null}
                      signedIn={signedIn}
                    />
                  </div>
                </div>
                <span className="flex shrink-0 gap-1.5">
                  {item.channels.map((value) => (
                    <Tag key={value} variant={CHANNEL_TAG_VARIANTS[value] ?? "neutral"}>
                      {value}
                    </Tag>
                  ))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {feed.pageCount > 1 ? (
        <nav className="mt-6 flex items-center gap-4">
          {feed.page > 1 ? (
            <Link
              href={feedHref({
                ...(channel !== undefined ? { channel } : {}),
                country,
                type: factType,
                page: feed.page - 1,
              })}
              className="type-small hover:text-accent"
            >
              ← Newer
            </Link>
          ) : null}
          <span className="type-data text-ink-muted">
            Page {feed.page} of {feed.pageCount} · {feed.total} items
          </span>
          {feed.page < feed.pageCount ? (
            <Link
              href={feedHref({
                ...(channel !== undefined ? { channel } : {}),
                country,
                type: factType,
                page: feed.page + 1,
              })}
              className="type-small hover:text-accent"
            >
              Older →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

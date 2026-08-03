import type { Metadata } from "next";
import Link from "next/link";
import { CHANNELS } from "@continuum/shared";
import { feedFilterOptions, listFeed, type FeedItem } from "@continuum/db";
import { FeedTimeline, type FeedCard } from "@/components/redesign/feed-timeline";
import { countryName } from "@/lib/public-labels";

export const dynamic = "force-dynamic";

/**
 * FLAGSHIP REDESIGN — /feed in the Dealroom-newsfeed register, our tokens.
 * Left "Views" rail · multi-select type chips · central-spine timeline with
 * alternating cards. Server-rendered; motion is a client island. Data comes
 * through listFeed() — identical call in MOCK_MODE and real mode (the switch
 * lives in the repo layer; see @continuum/shared mock/ + README).
 *
 * NOTE (pre-merge): the Phase 30 ReactionBand does not sit on the new cards
 * yet (cards are whole-card links); it re-attaches before this branch merges.
 */

const CHANNEL_LABELS: Record<string, string> = {
  distressed: "Distressed",
  private_credit: "Private credit",
  vc_founders: "VC & founders",
  pe: "PE",
  lp_institutional: "LP",
  vendors: "Vendors",
};

/** Chip row — multi-select fact-type groups, dot-coded by OUR accents. */
const CHIPS: { key: string; label: string; factTypes: string[]; accent: string }[] = [
  { key: "fund-closes", label: "Fund closes", factTypes: ["fund_close", "mandate"], accent: "var(--color-class-private-equity)" },
  { key: "acquisitions", label: "Acquisitions", factTypes: ["acquisition", "exit"], accent: "var(--color-class-real-assets)" },
  { key: "rounds", label: "Rounds", factTypes: ["funding_round"], accent: "var(--color-class-digital)" },
  { key: "distressed", label: "Distressed", factTypes: ["npl_sale", "credit_event", "insolvency", "bankruptcy_asset_sale", "insolvency_filing"], accent: "var(--color-distressed)" },
  { key: "people-moves", label: "People moves", factTypes: ["people_move"], accent: "var(--color-ink-muted)" },
];

const VIEWS: { label: string; href: string; active?: boolean }[] = [
  { label: "Feed", href: "/feed", active: true },
  { label: "Companies", href: "/companies" },
  { label: "Deals", href: "/deals" },
  { label: "Investors", href: "/rankings" },
  { label: "Signals", href: "/coverage" },
  { label: "Map", href: "/ecosystem" },
  { label: "Sectors", href: "/markets" },
];

const KICKER_LABELS: Record<string, string> = {
  fund_close: "Fund close",
  acquisition: "Acquisition",
  funding_round: "Round",
  npl_sale: "NPL sale",
  people_move: "People move",
  credit_event: "Credit event",
  insolvency: "Insolvency",
  mandate: "LP commitment",
  exit: "Exit",
};

const CHANNEL_ACCENTS: Record<string, string> = {
  distressed: "var(--color-distressed)",
  private_credit: "var(--color-credit)",
  pe: "var(--color-equity)",
  vc_founders: "var(--color-class-digital)",
  lp_institutional: "var(--color-class-structured)",
  vendors: "var(--color-ink-muted)",
};

type FeedSearchParams = {
  channel?: string;
  country?: string;
  chips?: string;
  page?: string;
  mock?: string;
};

function feedHref(params: {
  channel?: string;
  country?: string;
  chips?: string[];
  page?: number;
  mock?: boolean;
}): string {
  const query = new URLSearchParams();
  if (params.channel) query.set("channel", params.channel);
  if (params.country) query.set("country", params.country);
  if (params.chips !== undefined && params.chips.length > 0) query.set("chips", params.chips.join(","));
  if (params.page !== undefined && params.page > 1) query.set("page", String(params.page));
  if (params.mock === true) query.set("mock", "1");
  const suffix = query.toString();
  return suffix === "" ? "/feed" : `/feed?${suffix}`;
}

function relativeTime(iso: string | null, now: Date): string {
  if (iso === null) {
    return "";
  }
  const ms = now.getTime() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3600_000);
  if (hours < 1) return "just recorded";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return iso.slice(0, 10);
}

function accentFor(item: FeedItem): string {
  if (item.entityAssetClass != null) {
    return `var(--color-class-${item.entityAssetClass})`;
  }
  for (const channel of item.channels) {
    const accent = CHANNEL_ACCENTS[channel];
    if (accent !== undefined) return accent;
  }
  return "var(--color-ink-muted)";
}

function toCard(item: FeedItem, now: Date): FeedCard {
  const place = [item.entityCity ?? null, item.entityCountry !== null ? countryName(item.entityCountry) : null]
    .filter(Boolean)
    .join(", ");
  const kicker = KICKER_LABELS[item.factType] ?? item.factType.replaceAll("_", " ");
  const meta = [place, item.entityName].filter(Boolean).join(" · ");
  return {
    id: item.id,
    headline: item.title,
    contextLine: item.contextLine ?? null,
    entityName: item.entityName,
    entityHref: item.entityHref,
    metaLine: meta,
    kickerLabel: kicker,
    accent: accentFor(item),
    relativeTime: relativeTime(item.recordedAtIso ?? null, now),
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<FeedSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  return {
    title: "Feed",
    description:
      "The live record of European alternative-asset events — fund closes, acquisitions, rounds, distressed situations, and people moves, each with its source.",
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
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  // ?mock=1 — per-page mock preview (design scaffolding; labeled below).
  const mock = params.mock === "1";
  const selectedChips = (params.chips ?? "")
    .split(",")
    .filter((key) => CHIPS.some((c) => c.key === key));
  const factTypes = CHIPS.filter((c) => selectedChips.includes(c.key)).flatMap((c) => c.factTypes);

  const [feed, options] = await Promise.all([
    listFeed({
      ...(channel !== undefined ? { channel } : {}),
      country,
      ...(factTypes.length > 0 ? { factTypes } : {}),
      page,
      ...(mock ? { mock } : {}),
    }),
    feedFilterOptions(mock ? { mock } : {}),
  ]);
  const now = new Date();
  const cards = feed.items.map((item) => toCard(item, now));
  const updatedLabel =
    feed.updatedAt !== null
      ? new Date(feed.updatedAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const chipHref = (key: string) =>
    feedHref({
      ...(channel !== undefined ? { channel } : {}),
      country,
      chips: selectedChips.includes(key)
        ? selectedChips.filter((k) => k !== key)
        : [...selectedChips, key],
      mock,
    });

  return (
    <div className="py-10 lg:grid lg:grid-cols-[188px_minmax(0,1fr)] lg:gap-10">
      {/* ── LEFT RAIL — Views. */}
      <aside className="mb-8 lg:mb-0">
        <div className="type-label mb-2">Views</div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
          {VIEWS.map((view) => (
            <Link
              key={view.label}
              href={view.href}
              className={
                view.active === true
                  ? "border-l-2 border-accent bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] px-3 py-1.5 text-[13px] font-medium text-accent"
                  : "border-l-2 border-transparent px-3 py-1.5 text-[13px] text-ink-secondary hover:text-accent"
              }
            >
              {view.label}
            </Link>
          ))}
        </nav>
        {mock ? (
          <p className="type-small mt-6 border-l-2 border-line-strong pl-2 text-ink-muted">
            Design preview — mock data. Remove ?mock=1 for the live record.
          </p>
        ) : null}
      </aside>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="type-h1">Feed</h1>
            <p className="mt-1 max-w-2xl text-ink-secondary">
              The record as it happens — every item carries its source.
            </p>
          </div>
          {updatedLabel !== null ? (
            <span className="type-small flex items-center gap-1.5 text-ink-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-positive" />
              Updated {updatedLabel}
            </span>
          ) : null}
        </div>

        {/* ── FILTER CHIPS — multi-select, dot-coded by our accents. */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-line pb-3">
          <Link
            href={feedHref({ ...(channel !== undefined ? { channel } : {}), country, mock })}
            className={`rounded-sm border px-2.5 py-1 text-[13px] ${
              selectedChips.length === 0
                ? "border-line-strong bg-surface font-medium text-ink"
                : "border-line text-ink-secondary hover:border-line-strong"
            }`}
          >
            All
          </Link>
          {CHIPS.map((chip) => {
            const selected = selectedChips.includes(chip.key);
            return (
              <Link
                key={chip.key}
                href={chipHref(chip.key)}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[13px] ${
                  selected
                    ? "border-line-strong bg-surface font-medium text-ink"
                    : "border-line text-ink-secondary hover:border-line-strong"
                }`}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: chip.accent }}
                />
                {chip.label}
              </Link>
            );
          })}
          {/* Country — compact GET form, no client JS. */}
          <form action="/feed" method="get" className="ml-auto flex items-center gap-1.5">
            {channel !== undefined ? <input type="hidden" name="channel" value={channel} /> : null}
            {selectedChips.length > 0 ? (
              <input type="hidden" name="chips" value={selectedChips.join(",")} />
            ) : null}
            {mock ? <input type="hidden" name="mock" value="1" /> : null}
            <select
              name="country"
              defaultValue={country}
              className="rounded-sm border border-line bg-surface px-2 py-1 text-[12px] text-ink-secondary"
            >
              <option value="">All countries</option>
              {options.countries.map((code) => (
                <option key={code} value={code}>
                  {countryName(code)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-sm border border-line px-2 py-1 text-[12px] text-ink-secondary hover:border-line-strong hover:text-ink"
            >
              Go
            </button>
          </form>
        </div>

        {/* ── CHANNEL sub-row (existing channel filter, quiet). */}
        <div className="mt-3 flex flex-wrap gap-1">
          <Link
            href={feedHref({ country, chips: selectedChips, mock })}
            className={`px-2 py-0.5 text-[12px] ${channel === undefined ? "font-medium text-accent" : "text-ink-muted hover:text-accent"}`}
          >
            All channels
          </Link>
          {CHANNELS.map((value) => (
            <Link
              key={value}
              href={feedHref({ channel: value, country, chips: selectedChips, mock })}
              className={`px-2 py-0.5 text-[12px] ${channel === value ? "font-medium text-accent" : "text-ink-muted hover:text-accent"}`}
            >
              {CHANNEL_LABELS[value] ?? value}
            </Link>
          ))}
        </div>

        {/* ── TIMELINE. */}
        {cards.length === 0 ? (
          <p className="mt-8 text-[13px] text-ink-secondary">
            No items match these filters — coverage expanding.
          </p>
        ) : (
          <div className="mt-8">
            <FeedTimeline cards={cards} />
          </div>
        )}

        {/* ── PAGINATION (no infinite scroll). */}
        {feed.pageCount > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-4 border-t border-line pt-4">
            {feed.page > 1 ? (
              <Link
                href={feedHref({ ...(channel !== undefined ? { channel } : {}), country, chips: selectedChips, page: feed.page - 1, mock })}
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
                href={feedHref({ ...(channel !== undefined ? { channel } : {}), country, chips: selectedChips, page: feed.page + 1, mock })}
                className="type-small hover:text-accent"
              >
                Load older →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

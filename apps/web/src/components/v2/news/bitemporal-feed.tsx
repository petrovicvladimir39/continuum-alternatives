"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import {
  buildMockThreads,
  mockImage,
  splitMentions,
  MOCK_MEMBERS,
  type MockFeedItem,
  type MockThread,
} from "@continuum/shared";
import { EntityHoverCard } from "@/components/v2/entity-hover-card";
import { fmtDate, timeAgo } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * BitemporalFeed — chronological, provenance-backed items. Every item
 * carries its class accent (4px left slot + kicker), source citation, and a
 * Provenance Bar wired to the reactions model shape (Validate=credible,
 * Dispute=doubtful) against mock state persisted in localStorage. Cutover
 * points the bar at the real reactions API without changing the shape.
 */

type Reaction = { validated: boolean; disputed: boolean; saved: boolean };
const REACTIONS_KEY = "v2-reactions";

function loadReactions(): Record<string, Reaction> {
  try {
    return JSON.parse(window.localStorage.getItem(REACTIONS_KEY) ?? "{}") as Record<string, Reaction>;
  } catch {
    return {};
  }
}

/** Deterministic base counts from the fact id. */
function baseCounts(id: string): { validates: number; disputes: number } {
  let h = 0;
  for (const ch of id) {
    h = (h * 31 + ch.charCodeAt(0)) % 997;
  }
  return { validates: h % 34, disputes: h % 5 };
}

const FACT_TYPE_LABEL: Record<string, string> = {
  fund_close: "Fund close",
  acquisition: "Acquisition",
  funding_round: "Round",
  npl_sale: "NPL sale",
  people_move: "People",
  credit_event: "Credit event",
  insolvency: "Insolvency",
  mandate: "Mandate",
  exit: "Exit",
  hf_launch: "Hedge funds",
  securitisation: "Securitisation",
  esoteric_deal: "Esoteric",
  collectibles_sale: "Collectibles",
  climate_issue: "Climate & ILS",
  digital_issue: "Digital",
  regulatory: "Regulatory",
  auction_update: "Auction",
};

function ThreadDrawer({
  item,
  onClose,
}: {
  item: MockFeedItem;
  onClose: () => void;
}) {
  const threads = useMemo<MockThread[]>(() => {
    const all = buildMockThreads();
    const byMention = all.filter((t) =>
      [t.root, ...t.replies].some((p) => p.body.includes(`@{${item.entityName}}`)),
    );
    const byClass = all.filter((t) => t.assetClass === item.entityAssetClass);
    const merged = [...byMention, ...byClass.filter((t) => !byMention.includes(t))];
    return merged.slice(0, 5);
  }, [item]);
  const memberById = useMemo(() => new Map(MOCK_MEMBERS.map((m) => [m.id, m])), []);

  return (
    <div className="fixed inset-0 z-[90]" role="presentation" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-line-strong bg-ground p-5"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="type-label">Context / Thread</div>
            <h3 className="type-h3 mt-1">{item.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close context drawer" className="cursor-pointer text-ink-muted hover:text-ink">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="type-small mt-2 text-ink-secondary">
          Signals and member discussion around <EntityHoverCard slug={item.entitySlug} name={item.entityName} />.
        </div>
        <div className="mt-5 space-y-4">
          {threads.length === 0 ? (
            <div className="terminal-empty">[ 0 THREADS REFERENCE THIS ENTITY ]</div>
          ) : (
            threads.map((t) => {
              const author = memberById.get(t.root.memberId);
              const accent = v2Accent(t.assetClass, null);
              return (
                <article key={t.id} className={`border border-line bg-surface p-3 ${accent?.left ?? ""}`}>
                  <div className="type-small flex items-baseline justify-between text-ink-muted">
                    <span>
                      {author?.name} · {author?.organization}
                    </span>
                    <span className="type-data" suppressHydrationWarning>
                      {timeAgo(t.root.postedAt)}
                    </span>
                  </div>
                  <p className="type-body mt-1.5">
                    {splitMentions(t.root.body).map((part, i) =>
                      part.type === "mention" ? (
                        <EntityHoverCard key={i} name={part.value} />
                      ) : (
                        <span key={i}>{part.value}</span>
                      ),
                    )}
                  </p>
                  <div className="type-mono mt-2 text-ink-muted">
                    {t.replies.length} REPLIES · {t.validates} VALIDATE · {t.disputes} DISPUTE
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}

function ProvenanceBar({
  item,
  reaction,
  onChange,
  onThread,
}: {
  item: MockFeedItem;
  reaction: Reaction;
  onChange: (r: Reaction) => void;
  onThread: () => void;
}) {
  const base = baseCounts(item.id);
  const btn =
    "type-label cursor-pointer px-1.5 py-0.5 transition-colors hover:text-ink";
  return (
    <div className="mt-2 flex items-center gap-1 text-ink-muted">
      <button
        type="button"
        className={`${btn} ${reaction.validated ? "text-positive" : ""}`}
        onClick={() => onChange({ ...reaction, validated: !reaction.validated, disputed: false })}
        title="Validate — I find this credible"
      >
        [ Validate {base.validates + (reaction.validated ? 1 : 0)} ]
      </button>
      <button type="button" className={btn} onClick={onThread} title="Open context and threads">
        [ Context/Thread ]
      </button>
      <button
        type="button"
        className={`${btn} ${reaction.disputed ? "text-negative" : ""}`}
        onClick={() => onChange({ ...reaction, disputed: !reaction.disputed, validated: false })}
        title="Dispute — I doubt this"
      >
        [ Dispute {base.disputes + (reaction.disputed ? 1 : 0)} ]
      </button>
      <button
        type="button"
        className={`${btn} ${reaction.saved ? "text-ink" : ""}`}
        onClick={() => onChange({ ...reaction, saved: !reaction.saved })}
        title="Save to workspace"
      >
        [ {reaction.saved ? "Saved" : "Save"} ]
      </button>
    </div>
  );
}

export function FeedItemCard({
  item,
  reaction,
  onReaction,
  onThread,
  withImage = true,
}: {
  item: MockFeedItem;
  reaction: Reaction;
  onReaction: (r: Reaction) => void;
  onThread: () => void;
  withImage?: boolean;
}) {
  const cls = v2ClassFor(item.entityAssetClass);
  const accent = v2Accent(item.entityAssetClass, item.entityStrategySlug);
  return (
    <article className={`border-b border-line bg-surface px-4 py-3 transition-colors hover:bg-muted/50 ${accent?.left ?? "border-l-4 border-l-line"}`}>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className={`type-label ${accent?.text ?? "text-ink-muted"}`}>
              {cls?.label ?? "Cross-asset"} · {FACT_TYPE_LABEL[item.factType] ?? item.factType}
            </span>
            <span className="type-data shrink-0 text-ink-muted" suppressHydrationWarning>
              {timeAgo(item.recordedAt)}
            </span>
          </div>
          <h3 className="type-h3 mt-1">{item.title}</h3>
          {item.contextLine !== null ? (
            <p className="type-small mt-0.5 text-ink-secondary">{item.contextLine}</p>
          ) : null}
          <div className="type-small mt-1.5 flex flex-wrap items-baseline gap-x-2 text-ink-muted">
            <EntityHoverCard slug={item.entitySlug} name={item.entityName} />
            <span>· {item.entityCity}, {item.entityCountry}</span>
            <span>
              · {item.sourceUrl !== null ? (
                <a href={item.sourceUrl} className="underline decoration-dotted hover:text-ink" target="_blank" rel="noreferrer">
                  {item.sourceName}
                </a>
              ) : (
                item.sourceName
              )}
            </span>
            <span className="type-data">· occurred {fmtDate(item.occurredOn)}</span>
          </div>
          <ProvenanceBar item={item} reaction={reaction} onChange={onReaction} onThread={onThread} />
        </div>
        {withImage && item.imageSeed !== null ? (
          // Prototype thumbnail (seeded placeholder); becomes the source OG
          // image or a typographic cover at real-data cutover.
          <img
            src={mockImage(item.imageSeed, 240, 150)}
            alt=""
            width={120}
            height={75}
            loading="lazy"
            className="hidden h-[75px] w-[120px] shrink-0 border border-line object-cover sm:block"
          />
        ) : null}
      </div>
    </article>
  );
}

export function BitemporalFeed({
  items,
  pageSize = 30,
}: {
  items: MockFeedItem[];
  pageSize?: number;
}) {
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});
  const [threadItem, setThreadItem] = useState<MockFeedItem | null>(null);
  const [shown, setShown] = useState(pageSize);
  const [tickerCount, setTickerCount] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    setReactions(loadReactions());
  }, []);

  // Quiet "new items" ticker — simulates live signals arriving.
  useEffect(() => {
    const id = window.setInterval(() => setTickerCount((c) => (c < 9 ? c + 1 : c)), 45_000);
    return () => window.clearInterval(id);
  }, []);

  const update = (factId: string, r: Reaction) => {
    const next = { ...reactions, [factId]: r };
    setReactions(next);
    try {
      window.localStorage.setItem(REACTIONS_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — reactions stay session-local
    }
  };

  const visible = items.slice(0, shown);
  const none: Reaction = { validated: false, disputed: false, saved: false };

  return (
    <div>
      {tickerCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            setTickerCount(0);
            window.scrollTo({ top: 0, behavior: reduced === true ? "auto" : "smooth" });
          }}
          className="type-mono w-full cursor-pointer border-b border-line bg-surface px-4 py-1.5 text-left text-ink-secondary transition-colors hover:text-ink"
        >
          ▲ {tickerCount} NEW SIGNAL{tickerCount > 1 ? "S" : ""} RECORDED — FEED IS LIVE-SORTED
        </button>
      ) : null}

      {visible.length === 0 ? (
        <div className="terminal-empty m-4">[ 0 MATCHING SIGNALS IN QUERY — CLEAR FILTERS TO RESET ]</div>
      ) : (
        visible.map((item, i) => (
          <motion.div
            key={item.id}
            initial={reduced === true ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
          >
            <FeedItemCard
              item={item}
              reaction={reactions[item.id] ?? none}
              onReaction={(r) => update(item.id, r)}
              onThread={() => setThreadItem(item)}
            />
          </motion.div>
        ))
      )}

      {shown < items.length ? (
        <button
          type="button"
          onClick={() => setShown((s) => s + pageSize)}
          className="type-label w-full cursor-pointer border-b border-line px-4 py-3 text-left text-ink-secondary transition-colors hover:text-ink"
        >
          Load more · {items.length - shown} remaining
        </button>
      ) : null}

      {threadItem !== null ? <ThreadDrawer item={threadItem} onClose={() => setThreadItem(null)} /> : null}
    </div>
  );
}

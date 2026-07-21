"use client";

import { useMemo } from "react";
import type { AskFilters } from "@continuum/shared";
import { V2_CLASSES } from "@/lib/v2/taxonomy";

/**
 * AiCommandCanvas — the prompt box over the record. Typing and chips edit
 * ONE query string; parseAsk grounds it deterministically (no LLM), the URL
 * carries it (?ask=), and the feed filters live without a reload.
 */

/** Floating suggestion chips: all NINE classes + strategies + geographies. */
const STRATEGY_CHIPS: [string, string][] = [
  ["NPLs", "npls"],
  ["Direct lending", "direct lending"],
  ["Buyouts", "buyouts"],
  ["Secondaries", "secondaries"],
  ["CLOs", "clos"],
  ["Cat bonds", "cat bonds"],
  ["Royalties", "royalties"],
  ["Fine art", "fine art"],
  ["Tokenized RWA", "tokenized"],
  ["Venture debt", "venture debt"],
];

const GEO_CHIPS: [string, string][] = [
  ["Poland", "poland"],
  ["Germany", "germany"],
  ["Italy", "italy"],
  ["Iberia", "spain"],
  ["Greece", "greece"],
  ["Baltics", "lithuania"],
  ["Balkans", "serbia"],
];

export function CommandCanvas({
  query,
  setQuery,
  filters,
  resultCount,
}: {
  query: string;
  setQuery: (q: string) => void;
  filters: AskFilters | null;
  resultCount: number;
}) {
  const activeTokens = useMemo(
    () => new Set((filters?.matches ?? []).flatMap((m) => m.tokens.map((t) => t.toLowerCase()))),
    [filters],
  );

  const append = (token: string) => {
    setQuery(query.trim() === "" ? token : `${query.trim()} ${token}`);
  };

  const removeMatch = (tokens: string[]) => {
    const drop = new Set(tokens.map((t) => t.toLowerCase()));
    setQuery(
      query
        .split(/\s+/)
        .filter((t) => !drop.has(t.toLowerCase()))
        .join(" "),
    );
  };

  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter 30,500 entities or ask the record…"
          className="type-h2 w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
          aria-label="Ask the record"
        />
        <div className="mt-1 flex items-baseline justify-between">
          <span className="type-mono text-ink-muted">
            DETERMINISTIC PARSE · NO RELOAD · {resultCount} SIGNALS IN VIEW
          </span>
        </div>

        {/* Active chips (grounded matches) — click removes their tokens. */}
        {filters !== null && filters.matches.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {filters.matches.map((m) => (
              <button
                key={`${m.kind}:${m.value}`}
                type="button"
                onClick={() => removeMatch(m.tokens)}
                className="type-label cursor-pointer border border-ink px-2 py-0.5 text-ink transition-colors hover:bg-muted"
              >
                {m.label} ×
              </button>
            ))}
            {filters.freeText !== "" ? (
              <span className="type-label border border-dashed border-line-strong px-2 py-0.5 text-ink-secondary">
                “{filters.freeText}”
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Floating suggestion chips — all nine classes, strategies, geos. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {V2_CLASSES.map((c) => {
            const token = c.label.toLowerCase();
            const active = activeTokens.has(token.split(" ")[0]!);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => append(token)}
                disabled={active}
                className={`type-label cursor-pointer px-2 py-0.5 transition-colors disabled:cursor-default disabled:opacity-40 ${c.accent.chip} hover:bg-muted`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {STRATEGY_CHIPS.map(([label, token]) => (
            <button
              key={token}
              type="button"
              onClick={() => append(token)}
              className="type-label cursor-pointer border border-line px-2 py-0.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
            >
              {label}
            </button>
          ))}
          <span className="type-mono px-1 text-ink-muted">·</span>
          {GEO_CHIPS.map(([label, token]) => (
            <button
              key={token}
              type="button"
              onClick={() => append(token)}
              className="type-label cursor-pointer border border-line px-2 py-0.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  MOCK_ARTICLES,
  MOCK_AUCTIONS,
  MOCK_ENTITIES,
  mockFeedPage,
} from "@continuum/shared";
import { BitemporalFeed } from "@/components/v2/news/bitemporal-feed";
import { classCoverage } from "@/lib/v2/coverage";
import { fmtDate, fmtEuroM, fmtInt } from "@/lib/v2/format";
import { v2ClassBySlug, v2StrategiesFor } from "@/lib/v2/taxonomy";

/**
 * P2 — one front per asset class. Class-accent masthead, animated count-up
 * stat band, strategy sub-chips filtering the class feed live, top
 * entities, and a class-relevant module (NPL→auctions, PE→fund closes,
 * Climate→coverage note). Terminal empty states appear only when a chip
 * filter genuinely returns nothing.
 */

function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced === true ? value : 0);
  const started = useRef(false);
  useEffect(() => {
    if (reduced === true || started.current) {
      setDisplay(value);
      return;
    }
    started.current = true;
    const t0 = performance.now();
    const duration = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    // rAF is throttled in background tabs — guarantee the final value.
    const settle = window.setTimeout(() => setDisplay(value), duration + 100);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [value, reduced]);
  return <span className="tabular-nums">{fmtInt(display)}</span>;
}

export function ClassFront({ classSlug }: { classSlug: string }) {
  const cls = v2ClassBySlug(classSlug)!;
  const strategies = v2StrategiesFor(classSlug);
  const coverage = useMemo(() => classCoverage(classSlug), [classSlug]);
  const [strategy, setStrategy] = useState<string | null>(null);

  const items = useMemo(() => {
    const opts: Parameters<typeof mockFeedPage>[0] = { pageSize: 400, assetClass: classSlug };
    if (strategy !== null) {
      opts.strategySlug = strategy;
    }
    return mockFeedPage(opts).items;
  }, [classSlug, strategy]);

  const topEntities = useMemo(
    () =>
      MOCK_ENTITIES.filter(
        (e) =>
          e.assetClass === classSlug &&
          e.aumM !== null &&
          (strategy === null || e.strategySlug === strategy),
      )
        .sort((a, b) => (b.aumM ?? 0) - (a.aumM ?? 0))
        .slice(0, 8),
    [classSlug, strategy],
  );

  const classArticles = useMemo(
    () =>
      MOCK_ARTICLES.filter((a) => a.assetClass === classSlug)
        .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))
        .slice(0, 3),
    [classSlug],
  );

  const fundCloses = useMemo(
    () => mockFeedPage({ pageSize: 400, assetClass: classSlug, factTypes: ["fund_close"] }).items.slice(0, 5),
    [classSlug],
  );

  return (
    <div>
      {/* Masthead — 2px class rule, the sanctioned accent usage. */}
      <header className={`border-b border-line bg-surface ${cls.accent.top}`}>
        <div className="mx-auto w-full max-w-[1600px] px-4 py-8">
          <div className={`type-label ${cls.accent.text}`}>Markets · {cls.code}</div>
          <h1 className="type-display mt-2">{cls.label}</h1>
          <p className="type-body mt-2 max-w-[560px] text-ink-secondary">{cls.desk}</p>

          {/* Count-up stat band */}
          <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
            {(
              [
                ["Entities", coverage.entities],
                ["Signals · 60d", coverage.signals],
                ["Strategies", coverage.strategies],
                ["Countries", coverage.countries],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-surface px-4 py-3">
                <div className="type-label">{label}</div>
                <div className="type-data mt-1 text-[22px] leading-7">
                  <CountUp value={value} />
                </div>
              </div>
            ))}
          </div>

          {/* Strategy sub-chips */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStrategy(null)}
              className={`type-label cursor-pointer px-2 py-0.5 transition-colors ${
                strategy === null ? "border border-ink text-ink" : "border border-line text-ink-secondary hover:border-line-strong"
              }`}
            >
              All strategies
            </button>
            {strategies.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setStrategy(strategy === s.slug ? null : s.slug)}
                className={`type-label cursor-pointer px-2 py-0.5 transition-colors ${
                  strategy === s.slug ? cls.accent.chip : "border border-line text-ink-secondary hover:border-line-strong"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[65fr_35fr]">
        {/* Class feed */}
        <section className="min-w-0 border border-line">
          <BitemporalFeed items={items} />
        </section>

        <aside className="space-y-6">
          {/* Top entities */}
          <section className="border border-line bg-surface">
            <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
              <span className="type-label">Top entities · AUM</span>
              <Link href={`/v2/products/company-intelligence?class=${cls.slug}`} className="type-mono text-ink-muted transition-colors hover:text-ink">
                SCREEN →
              </Link>
            </div>
            {topEntities.length === 0 ? (
              <div className="terminal-empty m-3">[ 0 ENTITIES MATCH THIS STRATEGY FILTER ]</div>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {topEntities.map((e, i) => (
                    <tr key={e.id} className="border-b border-line transition-colors last:border-b-0 hover:bg-muted/50">
                      <td className="type-data w-6 py-2 pl-3 text-ink-muted">{i + 1}</td>
                      <td className="py-2 pl-2">
                        <span className="type-small block truncate">{e.name}</span>
                        <span className="type-data text-ink-muted">{e.city} · {e.country}</span>
                      </td>
                      <td className="type-data py-2 pr-3 text-right">{fmtEuroM(e.aumM)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Class-relevant module */}
          {classSlug === "private-credit" ? (
            <section className="border border-line bg-surface">
              <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
                <span className="type-label">Live NPL auctions</span>
                <Link href="/v2/news/auctions" className="type-mono text-ink-muted transition-colors hover:text-ink">
                  ALL →
                </Link>
              </div>
              {MOCK_AUCTIONS.filter((a) => a.assetType.includes("NPL")).slice(0, 4).map((a) => (
                <div key={a.id} className="border-b border-line px-3 py-2 last:border-b-0">
                  <div className="type-small">{a.title}</div>
                  <div className="type-data mt-0.5 flex justify-between text-ink-muted">
                    <span>{a.country} · {a.sizeText}</span>
                    <span>bids {fmtDate(a.deadline)}</span>
                  </div>
                </div>
              ))}
            </section>
          ) : classSlug === "private-equity" ? (
            <section className="border border-line bg-surface">
              <div className="border-b border-line px-3 py-2">
                <span className="type-label">Recent fund closes</span>
              </div>
              {fundCloses.length === 0 ? (
                <div className="terminal-empty m-3">[ 0 FUND CLOSES RECORDED · 60D ]</div>
              ) : (
                fundCloses.map((f) => (
                  <div key={f.id} className="border-b border-line px-3 py-2 last:border-b-0">
                    <div className="type-small">{f.title}</div>
                    <div className="type-data mt-0.5 text-ink-muted">{fmtDate(f.occurredOn)}</div>
                  </div>
                ))
              )}
            </section>
          ) : classSlug === "climate" ? (
            <section className="border border-line bg-surface p-3">
              <div className="type-label">Coverage note</div>
              <p className="type-small mt-2 text-ink-secondary">
                Climate & Insurance coverage is building: carbon-market and ILS entities are
                register-linked; verification of voluntary-market participants is in review. Depth
                is strongest in the Nordics and the Aegean cat-bond pipeline.
              </p>
              <Link href="/v2/coverage" className="type-mono mt-3 inline-block text-ink-muted transition-colors hover:text-ink">
                FULL COVERAGE GRID →
              </Link>
            </section>
          ) : (
            <section className="border border-line bg-surface">
              <div className="border-b border-line px-3 py-2">
                <span className="type-label">Analysis</span>
              </div>
              {classArticles.length === 0 ? (
                <div className="terminal-empty m-3">[ 0 TEAR SHEETS FILED FOR THIS CLASS ]</div>
              ) : (
                classArticles.map((a) => (
                  <Link key={a.id} href={`/v2/news/${a.slug}`} className="block border-b border-line px-3 py-2 transition-colors last:border-b-0 hover:bg-muted/50">
                    <div className="type-small font-medium">{a.headline}</div>
                    <div className="type-data mt-0.5 text-ink-muted">{fmtDate(a.publishedOn)}</div>
                  </Link>
                ))
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

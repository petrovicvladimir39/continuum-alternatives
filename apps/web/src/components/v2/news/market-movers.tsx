"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MOCK_AUCTIONS, MOCK_ENTITIES, type MockFeedItem } from "@continuum/shared";
import { daysUntil, fmtDateShort, fmtEuroM } from "@/lib/v2/format";
import { v2Accent, V2_CLASSES } from "@/lib/v2/taxonomy";

/**
 * MarketMovers rail — live auction tracker, league-table snippet, and the
 * "Today in Alternatives" class strip. Mock-driven; the auction tracker and
 * league table read the real repos at cutover.
 */

const AUCTION_STATUS: Record<string, string> = {
  live: "LIVE",
  second_round: "2ND ROUND",
  closing: "CLOSING",
};

export function MarketMovers({ items }: { items: MockFeedItem[] }) {
  const topEntities = useMemo(
    () =>
      MOCK_ENTITIES.filter((e) => e.aumM !== null && e.role === "gp")
        .sort((a, b) => (b.aumM ?? 0) - (a.aumM ?? 0))
        .slice(0, 6),
    [],
  );

  const todayByClass = useMemo(() => {
    const cutoff = Date.now() - 48 * 3600_000;
    const counts = new Map<string, number>();
    for (const item of items) {
      if (new Date(item.recordedAt).getTime() >= cutoff && item.entityAssetClass !== null) {
        counts.set(item.entityAssetClass, (counts.get(item.entityAssetClass) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  return (
    <aside className="space-y-6">
      {/* Live auction tracker */}
      <section className="border border-line bg-surface">
        <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
          <span className="type-label">Live auctions</span>
          <Link href="/v2/news/auctions" className="type-mono text-ink-muted transition-colors hover:text-ink">
            ALL →
          </Link>
        </div>
        {MOCK_AUCTIONS.slice(0, 5).map((a) => (
          <div key={a.id} className="border-b border-line px-3 py-2.5 last:border-b-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="type-body min-w-0 truncate">{a.title}</span>
              <span className="type-mono shrink-0 text-ink-muted">{AUCTION_STATUS[a.status]}</span>
            </div>
            <div className="type-data mt-0.5 flex items-baseline justify-between text-ink-secondary">
              <span>
                {a.country} · {a.sizeText}
              </span>
              <span suppressHydrationWarning>
                bids {fmtDateShort(a.deadline)} · {daysUntil(a.deadline)}d
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* League table snippet */}
      <section className="border border-line bg-surface">
        <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
          <span className="type-label">League table · AUM</span>
          <Link href="/v2/reports/league-tables" className="type-mono text-ink-muted transition-colors hover:text-ink">
            FULL →
          </Link>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            {topEntities.map((e, i) => {
              const accent = v2Accent(e.assetClass, e.strategySlug || null);
              return (
                <tr key={e.id} className="border-b border-line transition-colors last:border-b-0 hover:bg-muted/50">
                  <td className="type-data w-6 py-2 pl-3 text-ink-muted">{i + 1}</td>
                  <td className={`py-2 pl-2 ${accent?.left ?? ""}`}>
                    <span className="type-small block truncate pl-2">{e.name}</span>
                  </td>
                  <td className="type-data py-2 pr-3 text-right">{fmtEuroM(e.aumM)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Today in Alternatives */}
      <section className="border border-line bg-surface">
        <div className="border-b border-line px-3 py-2">
          <span className="type-label">Today in Alternatives</span>
        </div>
        <div className="px-3 py-2">
          {V2_CLASSES.map((c) => {
            const n = todayByClass.get(c.slug) ?? 0;
            return (
              <Link
                key={c.slug}
                href={`/v2/markets/${c.slug}`}
                className="flex items-baseline justify-between py-1 transition-colors hover:bg-muted/50"
              >
                <span className="type-small flex items-center gap-2 text-ink-secondary">
                  <span className={`inline-block h-2 w-2 ${c.accent.swatch}`} />
                  {c.label}
                </span>
                <span className="type-data text-ink-muted">{n} · 48h</span>
              </Link>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

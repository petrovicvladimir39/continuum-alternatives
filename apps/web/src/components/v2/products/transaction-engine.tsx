"use client";

import { useMemo, useState } from "react";
import { mockFeedPage, type MockFeedItem } from "@continuum/shared";
import { fmtDate } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * P5 — Transaction Engine: deals, fund closes and NPL trades as
 * structured, citable records. Type chips filter; columns sort; every row
 * keeps its source. Mock-driven; the deals repo backs this at cutover.
 */

const TX_TYPES: { key: string; label: string }[] = [
  { key: "acquisition", label: "Acquisitions" },
  { key: "exit", label: "Exits" },
  { key: "fund_close", label: "Fund closes" },
  { key: "npl_sale", label: "NPL trades" },
  { key: "securitisation", label: "Securitisations" },
  { key: "funding_round", label: "Rounds" },
  { key: "mandate", label: "LP mandates" },
];

export function TransactionEngine() {
  const [types, setTypes] = useState<Set<string>>(() => new Set(TX_TYPES.map((t) => t.key)));
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const items = mockFeedPage({ pageSize: 400, factTypes: [...types] }).items;
    return [...items].sort((a, b) =>
      sortDesc ? b.occurredOn.localeCompare(a.occurredOn) : a.occurredOn.localeCompare(b.occurredOn),
    );
  }, [types, sortDesc]);

  const toggle = (key: string) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
      <div className="type-label">Products</div>
      <h1 className="type-h1 mt-1">Transaction Engine</h1>
      <p className="type-small mt-1 max-w-[560px] text-ink-secondary">
        Every transaction as a structured, citable record — actor, action, counterparty, source.
        No estimates, no scraped rumor tier.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TX_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => toggle(t.key)}
            className={`type-label cursor-pointer px-2 py-0.5 transition-colors ${
              types.has(t.key) ? "border border-ink text-ink" : "border border-line text-ink-muted hover:border-line-strong"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto border border-line">
        <table className="w-full border-collapse">
          <thead className="sticky top-10 z-10 bg-surface">
            <tr className="border-b border-line-strong text-left">
              <th
                className="type-label cursor-pointer px-3 py-2 font-medium hover:text-ink"
                onClick={() => setSortDesc((v) => !v)}
              >
                Date {sortDesc ? "↓" : "↑"}
              </th>
              <th className="type-label px-3 py-2 font-medium">Class</th>
              <th className="type-label px-3 py-2 font-medium">Transaction</th>
              <th className="type-label px-3 py-2 font-medium">Geography</th>
              <th className="type-label px-3 py-2 text-right font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="terminal-empty m-3">[ 0 TRANSACTIONS MATCH — ENABLE A TYPE CHIP ]</div>
                </td>
              </tr>
            ) : (
              rows.map((item: MockFeedItem) => {
                const cls = v2ClassFor(item.entityAssetClass);
                const accent = v2Accent(item.entityAssetClass, item.entityStrategySlug);
                return (
                  <tr key={item.id} className={`border-b border-line transition-colors hover:bg-muted/50 ${accent?.left ?? ""}`}>
                    <td className="type-data whitespace-nowrap px-3 py-2">{fmtDate(item.occurredOn)}</td>
                    <td className="px-3 py-2">
                      {cls !== null ? (
                        <span className={`type-label px-1.5 py-0.5 ${cls.accent.chip}`}>{cls.code}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className="type-small block">{item.title}</span>
                      {item.contextLine !== null ? (
                        <span className="type-small text-ink-muted">{item.contextLine}</span>
                      ) : null}
                    </td>
                    <td className="type-data px-3 py-2">{item.entityCountry}</td>
                    <td className="type-mono px-3 py-2 text-right text-ink-muted">
                      {(item.sourceName ?? "—").toUpperCase()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="type-mono mt-2 text-ink-muted">{rows.length} RECORDS · 60D MOCK WINDOW</div>
    </div>
  );
}

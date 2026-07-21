import type { Metadata } from "next";
import Link from "next/link";
import { coverageRows, TOTAL_COUNTRIES, TOTAL_ENTITIES } from "@/lib/v2/coverage";
import { fmtInt } from "@/lib/v2/format";
import { V2_CLASSES, V2_STRATEGY_COUNT } from "@/lib/v2/taxonomy";

export const metadata: Metadata = { title: "Coverage" };

/**
 * /v2/coverage — the full 9-class × strategy taxonomy grid with live-style
 * counts and Active/Building states. Ambition + honesty as one artifact:
 * Active only where the prototype genuinely renders content; counts are
 * fixture aggregates until real-data cutover.
 */
export default function CoveragePage() {
  const rows = coverageRows();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
      <div className="type-label">Markets</div>
      <h1 className="type-display mt-2">Coverage</h1>
      <p className="type-body mt-3 max-w-[640px] text-ink-secondary">
        The taxonomy is the platform&apos;s organizing spine: {V2_CLASSES.length} asset classes,{" "}
        {V2_STRATEGY_COUNT} strategies, {fmtInt(TOTAL_ENTITIES)} entities across{" "}
        {TOTAL_COUNTRIES} countries. Every strategy below is either{" "}
        <span className="type-label border border-line px-1">Active</span> — the record renders
        content for it today — or{" "}
        <span className="type-label border border-dashed border-line-strong px-1">Building</span>,
        listed so the ambition is auditable.
      </p>
      <p className="type-mono mt-2 text-ink-muted">
        PER-STRATEGY COUNTS ARE PROTOTYPE FIXTURES · PLATFORM TOTALS ARE REAL
      </p>

      <div className="mt-8 space-y-10">
        {V2_CLASSES.map((cls) => {
          const classRows = rows.filter((r) => r.cls.slug === cls.slug);
          const activeCount = classRows.filter((r) => r.active).length;
          return (
            <section key={cls.slug}>
              <div className={`flex items-baseline justify-between border-b border-line pb-2 ${cls.accent.top} pt-2`}>
                <Link href={`/v2/markets/${cls.slug}`} className="group flex items-baseline gap-3">
                  <span className={`type-label ${cls.accent.text}`}>{cls.code}</span>
                  <span className="type-h2 group-hover:underline group-hover:decoration-dotted">
                    {cls.label}
                  </span>
                </Link>
                <span className="type-data text-ink-muted">
                  {activeCount}/{classRows.length} strategies active
                </span>
              </div>
              <table className="mt-1 w-full border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="type-label py-2 pr-4 font-medium">Strategy</th>
                    <th className="type-label py-2 pr-4 text-right font-medium">Entities</th>
                    <th className="type-label py-2 pr-4 text-right font-medium">Signals · 60d</th>
                    <th className="type-label py-2 text-right font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {classRows.map((r) => (
                    <tr key={r.strategySlug} className="border-b border-line transition-colors last:border-b-0 hover:bg-surface">
                      <td className="type-body py-2 pr-4">
                        {r.active ? (
                          <Link href={`/v2/markets/${cls.slug}`} className="hover:underline hover:decoration-dotted">
                            {r.strategyLabel}
                          </Link>
                        ) : (
                          <span className="text-ink-secondary">{r.strategyLabel}</span>
                        )}
                      </td>
                      <td className="type-data py-2 pr-4 text-right">{fmtInt(r.entities)}</td>
                      <td className="type-data py-2 pr-4 text-right">{r.active ? r.signals : "—"}</td>
                      <td className="py-2 text-right">
                        {r.active ? (
                          <span className={`type-label px-1.5 py-0.5 ${cls.accent.chip}`}>Active</span>
                        ) : (
                          <span className="type-label border border-dashed border-line-strong px-1.5 py-0.5 text-ink-muted">
                            Building
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}

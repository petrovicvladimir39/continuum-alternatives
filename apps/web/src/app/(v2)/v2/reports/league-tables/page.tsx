import type { Metadata } from "next";
import Link from "next/link";
import { MOCK_ENTITIES, MOCK_REPORTS } from "@continuum/shared";
import { ReportCover } from "@/components/v2/reports/report-cover";
import { fmtEuroM } from "@/lib/v2/format";
import { V2_CLASSES } from "@/lib/v2/taxonomy";

export const metadata: Metadata = { title: "League tables — Reports" };

/** Provenance-linked league tables per class + the ranked report shelf. */
export default function LeagueTablesPage() {
  const reports = MOCK_REPORTS.filter((r) => r.kind === "league-table");
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
      <div className="type-label">Reports & Insights</div>
      <h1 className="type-display mt-2">League tables</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        Rankings aggregate provenance-backed facts only: a close counts when a filing, press
        release or register entry confirms it. Estimates never rank. AUM figures below are
        prototype fixtures.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.id} href={`/v2/reports/${r.slug}`} className="transition-opacity hover:opacity-90">
            <ReportCover report={r} />
          </Link>
        ))}
      </div>

      <h2 className="type-label mt-12 border-b border-line pb-2">Top managers by class · AUM</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {V2_CLASSES.map((cls) => {
          const top = MOCK_ENTITIES.filter(
            (e) => e.assetClass === cls.slug && e.role === "gp" && e.aumM !== null,
          )
            .sort((a, b) => (b.aumM ?? 0) - (a.aumM ?? 0))
            .slice(0, 5);
          return (
            <section key={cls.slug} className={`border border-line bg-surface ${cls.accent.top}`}>
              <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
                <span className={`type-label ${cls.accent.text}`}>{cls.label}</span>
                <Link href={`/v2/markets/${cls.slug}`} className="type-mono text-ink-muted transition-colors hover:text-ink">
                  FRONT →
                </Link>
              </div>
              {top.length === 0 ? (
                <div className="terminal-empty m-3">[ 0 RANKED MANAGERS IN MOCK SET ]</div>
              ) : (
                <table className="w-full border-collapse">
                  <tbody>
                    {top.map((e, i) => (
                      <tr key={e.id} className="border-b border-line last:border-b-0">
                        <td className="type-data w-6 py-1.5 pl-3 text-ink-muted">{i + 1}</td>
                        <td className="type-small py-1.5 pl-2">{e.name}</td>
                        <td className="type-data py-1.5 pr-3 text-right">{fmtEuroM(e.aumM)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

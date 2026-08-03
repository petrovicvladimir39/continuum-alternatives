import type { Metadata } from "next";
import Link from "next/link";
import { MOCK_REPORTS } from "@continuum/shared";
import { ReportCover } from "@/components/v2/reports/report-cover";

export const metadata: Metadata = { title: "Reports & Insights" };

/** P7 — ReportGrid: date-stamped, class-tagged, typographic covers. */
export default function ReportsPage() {
  const reports = [...MOCK_REPORTS].sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="type-label">Reports & Insights</div>
          <h1 className="type-display mt-2">The record, synthesized</h1>
        </div>
        <nav className="flex gap-2">
          <Link href="/v2/reports/league-tables" className="type-label border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink">
            League tables
          </Link>
          <Link href="/v2/reports/watchdog-briefs" className="type-label border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink">
            Watchdog briefs
          </Link>
        </nav>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.id} href={`/v2/reports/${r.slug}`} className="group transition-opacity hover:opacity-90">
            <ReportCover report={r} />
          </Link>
        ))}
      </div>
    </div>
  );
}

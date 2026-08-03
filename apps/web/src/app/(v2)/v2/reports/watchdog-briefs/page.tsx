import type { Metadata } from "next";
import Link from "next/link";
import { MOCK_REPORTS, mockFeedPage } from "@continuum/shared";
import { ReportCover } from "@/components/v2/reports/report-cover";
import { fmtDate } from "@/lib/v2/format";

export const metadata: Metadata = { title: "Watchdog briefs — Reports" };

/** Monthly regulatory synthesis + the live supervision signal stream. */
export default function WatchdogBriefsPage() {
  const briefs = MOCK_REPORTS.filter((r) => r.kind === "watchdog-brief").sort((a, b) =>
    b.publishedOn.localeCompare(a.publishedOn),
  );
  const signals = mockFeedPage({ pageSize: 400, factTypes: ["regulatory"] }).items.slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8">
      <div className="type-label">Reports & Insights</div>
      <h1 className="type-display mt-2">Watchdog briefs</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        The month in European alternatives supervision — consultations, enforcement, licensing —
        synthesized from the regulatory feed with every claim cited.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[55fr_45fr]">
        <div className="grid grid-cols-1 gap-4">
          {briefs.map((r) => (
            <Link key={r.id} href={`/v2/reports/${r.slug}`} className="transition-opacity hover:opacity-90">
              <ReportCover report={r} />
            </Link>
          ))}
        </div>
        <aside>
          <div className="type-label border-b border-line pb-2">Live supervision signals</div>
          {signals.map((s) => (
            <div key={s.id} className="border-b border-line py-2.5 last:border-b-0">
              <div className="type-small">{s.title}</div>
              <div className="type-data mt-0.5 text-ink-muted">
                {s.entityName} · {fmtDate(s.occurredOn)}
              </div>
            </div>
          ))}
          <Link href="/v2/news/regulatory-watchdog" className="type-label mt-4 inline-block text-ink-secondary transition-colors hover:text-ink">
            Full regulatory feed →
          </Link>
        </aside>
      </div>
    </div>
  );
}

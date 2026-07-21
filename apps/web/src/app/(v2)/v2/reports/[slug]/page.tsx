import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_REPORTS, MOCK_REPORT_BY_SLUG } from "@continuum/shared";
import { ReportReader } from "@/components/v2/reports/report-reader";
import { fmtDate } from "@/lib/v2/format";
import { v2Accent, v2ClassFor } from "@/lib/v2/taxonomy";

export function generateStaticParams() {
  return MOCK_REPORTS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = MOCK_REPORT_BY_SLUG.get(slug);
  return { title: report === undefined ? "Reports" : report.title };
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = MOCK_REPORT_BY_SLUG.get(slug);
  if (report === undefined) {
    notFound();
  }
  const cls = report.assetClass === "cross-asset" ? null : v2ClassFor(report.assetClass);
  const accent = report.assetClass === "cross-asset" ? null : v2Accent(report.assetClass, null);

  return (
    <article>
      <header className={`border-b border-line bg-surface ${accent?.top ?? "border-t-2 border-t-ink"}`}>
        <div className="mx-auto w-full max-w-[1100px] px-4 py-8">
          <div className="flex items-baseline justify-between gap-4">
            <span className={`type-label ${accent?.text ?? "text-ink-muted"}`}>
              {cls?.label ?? "Cross-asset"} · {report.kind.replace(/-/g, " ")}
            </span>
            <span className="type-data text-ink-muted">
              {fmtDate(report.publishedOn)} · {report.pages} pp
            </span>
          </div>
          <h1 className="type-display mt-3 max-w-[800px]">{report.title}</h1>
          <p className="type-h3 mt-3 max-w-[680px] font-normal text-ink-secondary">{report.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {report.tags.map((t) => (
              <span key={t} className="type-label border border-line px-2 py-0.5 text-ink-secondary">
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>
      <ReportReader report={report} />
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-10">
        <Link href="/v2/reports" className="type-label text-ink-secondary transition-colors hover:text-ink">
          ← All reports
        </Link>
      </div>
    </article>
  );
}

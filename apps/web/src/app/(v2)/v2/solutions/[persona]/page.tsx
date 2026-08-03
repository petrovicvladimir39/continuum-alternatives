import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_REPORT_BY_SLUG } from "@continuum/shared";
import { ReportCover } from "@/components/v2/reports/report-cover";
import { solutionBySlug, V2_SOLUTIONS } from "@/lib/v2/solutions";

export function generateStaticParams() {
  return V2_SOLUTIONS.map((s) => ({ persona: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ persona: string }>;
}): Promise<Metadata> {
  const { persona } = await params;
  const solution = solutionBySlug(persona);
  return { title: solution === null ? "Solutions" : `${solution.persona} — Solutions` };
}

export default async function SolutionPage({ params }: { params: Promise<{ persona: string }> }) {
  const { persona } = await params;
  const solution = solutionBySlug(persona);
  if (solution === null) {
    notFound();
  }
  const report = MOCK_REPORT_BY_SLUG.get(solution.reportSlug);

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-10">
      <div className="type-label">{solution.persona}</div>
      <h1 className="type-display mt-3 max-w-[760px]">{solution.title}</h1>
      <p className="type-body mt-4 max-w-[620px] text-[15px] leading-[1.65] text-ink-secondary">
        {solution.lede}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
        {solution.claims.map((c) => (
          <div key={c.head} className="bg-surface p-4">
            <h2 className="type-h3">{c.head}</h2>
            <p className="type-small mt-2 leading-[1.6] text-ink-secondary">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_320px]">
        <div>
          <h2 className="type-h2">Start with the record</h2>
          <p className="type-small mt-2 max-w-[480px] text-ink-secondary">
            Founding membership opens the full feed, watchlists, alerts and analyst tools.
            Everything above exists today — nothing here is a roadmap slide.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Link href="/v2/about#pricing" className="type-label bg-primary px-4 py-2 text-primary-foreground transition-colors hover:opacity-90">
              Subscribe
            </Link>
            <Link href="/v2/about#contact" className="type-label border border-line px-4 py-2 text-ink-secondary transition-colors hover:border-line-strong hover:text-ink">
              Talk to us
            </Link>
          </div>
        </div>
        {report !== undefined ? (
          <Link href={`/v2/reports/${report.slug}`} className="transition-opacity hover:opacity-90">
            <div className="type-label mb-2">Relevant report</div>
            <ReportCover report={report} />
          </Link>
        ) : null}
      </div>

      <nav className="mt-14 border-t border-line pt-4">
        <div className="type-label mb-2">All solutions</div>
        <div className="flex flex-wrap gap-2">
          {V2_SOLUTIONS.map((s) => (
            <Link
              key={s.slug}
              href={`/v2/solutions/${s.slug}`}
              className={`type-label border px-2.5 py-1 transition-colors ${
                s.slug === solution.slug ? "border-ink text-ink" : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
            >
              {s.persona.replace(/^For /, "")}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

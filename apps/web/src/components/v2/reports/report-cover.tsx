import type { MockReport } from "@continuum/shared";
import { mockImage } from "@continuum/shared";
import { fmtDate } from "@/lib/v2/format";
import { v2ClassFor } from "@/lib/v2/taxonomy";

/**
 * Typographic report cover — serif title under a 2px class rule; an
 * optional hero image slot sits above the type when the report carries an
 * imageSeed. Sharp corners, hairline frame, no decoration.
 */
export function ReportCover({ report }: { report: MockReport }) {
  const cls = report.assetClass === "cross-asset" ? null : v2ClassFor(report.assetClass);
  return (
    <div className={`flex h-full flex-col border border-line bg-surface ${cls?.accent.top ?? "border-t-2 border-t-ink"}`}>
      {report.imageSeed !== null ? (
        <img
          src={mockImage(report.imageSeed, 640, 240)}
          alt=""
          width={320}
          height={120}
          loading="lazy"
          className="aspect-[8/3] w-full border-b border-line object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        <div className={`type-label ${cls?.accent.text ?? "text-ink-muted"}`}>
          {cls?.label ?? "Cross-asset"} · {report.kind.replace(/-/g, " ")}
        </div>
        <h3 className="type-h2 mt-2">{report.title}</h3>
        <p className="type-small mt-2 text-ink-secondary">{report.summary}</p>
        <div className="type-data mt-auto flex items-baseline justify-between pt-4 text-ink-muted">
          <span>{fmtDate(report.publishedOn)}</span>
          <span>{report.pages} pp</span>
        </div>
      </div>
    </div>
  );
}

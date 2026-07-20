import { reportCoverSvg } from "@continuum/shared";

/** Generated typographic cover — deterministic SVG from title + date. */
export function ReportCover({ title, date }: { title: string; date: string }) {
  return (
    <div
      className="w-full overflow-hidden rounded-sm border border-line"
      // Our own deterministic SVG string — no user input reaches this markup.
      dangerouslySetInnerHTML={{ __html: reportCoverSvg({ title, date }) }}
    />
  );
}

"use client";

/**
 * "Download" on the entity brief (Phase 29D) = browser print to PDF.
 * A real server-side PDF export is BACKLOG; this stays honest about it.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-sm border border-line-strong px-2.5 py-1 text-[12px] font-medium text-ink hover:border-accent hover:text-accent print:hidden"
    >
      Download (print to PDF)
    </button>
  );
}

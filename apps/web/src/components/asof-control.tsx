import Link from "next/link";

/**
 * Time-travel controls (Phase 34A) — deliberately quiet. The banner is a
 * persistent hairline, not a modal; return is one click. Articles and
 * discussion threads never time-travel (editorial is not the record).
 */

export function AsOfBanner({ asof, basePath }: { asof: string; basePath: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-strong pb-2 text-[13px]">
      <span className="text-ink">
        Viewing the record as of <span className="type-data font-medium">{asof}</span> — facts and
        relationships known to Continuum by that date.
      </span>
      <Link href={basePath} className="shrink-0 text-accent hover:underline">
        Back to today
      </Link>
    </div>
  );
}

export function AsOfControl({ basePath, asof }: { basePath: string; asof: string | null }) {
  return (
    <form action={basePath} method="get" className="flex items-baseline gap-2">
      <label htmlFor="asof-date" className="type-small text-ink-muted">
        View as of…
      </label>
      <input
        id="asof-date"
        type="date"
        name="asof"
        defaultValue={asof ?? ""}
        className="border border-line bg-surface px-1.5 py-0.5 text-[12px] text-ink outline-none focus:border-line-strong"
      />
      <button type="submit" className="type-small text-accent hover:underline">
        Go
      </button>
    </form>
  );
}

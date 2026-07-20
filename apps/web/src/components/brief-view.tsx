import type { BriefContent, BriefRow } from "@continuum/db";
import { PrintButton } from "@/components/print-button";

/**
 * Brief renderer (Phase 29D, extracted Phase 31D) — ONE framing for entity
 * briefs wherever they appear: the company brief page and event meeting
 * prep. `headerLine` is the only prep-specific addition ("Prepared for …").
 */
export function BriefView({
  entityName,
  brief,
  headerLine,
  profileHref,
}: {
  entityName: string;
  brief: BriefRow;
  headerLine?: string;
  profileHref: string;
}) {
  const content = brief.content as BriefContent;
  const generatedAt =
    brief.generatedAt === null ? "—" : brief.generatedAt.toISOString().replace("T", " ").slice(0, 16);

  return (
    <article>
      {/* Print-clean: site chrome disappears; the brief is the page. */}
      <style>{`@media print { header, footer, nav { display: none !important; } }`}</style>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-label">Entity brief</p>
          {headerLine !== undefined ? (
            <p className="type-data mt-0.5 text-[12px] text-ink-secondary">{headerLine}</p>
          ) : null}
          <h1 className="type-h1 mt-1">{entityName}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3 print:hidden">
          <PrintButton />
          <a href={profileHref} className="text-[13px] text-accent hover:underline">
            Profile →
          </a>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="type-h2">Summary</h2>
        <p className="mt-2 text-[14px] leading-[1.6] text-ink">{content.summary}</p>
      </section>

      <section className="mt-8">
        <h2 className="type-h2">Key facts</h2>
        <ul className="mt-2 space-y-2">
          {content.key_facts.map((fact) => (
            <li key={fact} className="flex gap-2 text-[13px] leading-[1.55] text-ink">
              <span aria-hidden className="text-ink-muted">
                —
              </span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </section>

      {content.relationships.length > 0 ? (
        <section className="mt-8">
          <h2 className="type-h2">Relationships</h2>
          <ul className="mt-2 space-y-1.5">
            {content.relationships.map((line) => (
              <li key={line} className="text-[13px] leading-[1.55] text-ink">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.watch_points.length > 0 ? (
        <section className="mt-8">
          <h2 className="type-h2">Watch points</h2>
          <ul className="mt-2 space-y-1.5">
            {content.watch_points.map((line) => (
              <li key={line} className="text-[13px] leading-[1.55] text-ink">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-10 border-t border-line pt-4">
        <p className="type-small text-ink-muted">
          Sources:{" "}
          {content.source_names.length > 0 ? content.source_names.join(" · ") : "platform record"}
        </p>
        <p className="type-small mt-1 text-ink-muted">
          Generated {generatedAt} UTC by {brief.model} from approved platform records only ·
          numbers and names are machine-checked against the cited material ·
          continuumalternatives.com{profileHref}
        </p>
      </footer>
    </article>
  );
}

import type { Metadata } from "next";
import { PreviewBanner } from "@/components/v2/products/preview-banner";

export const metadata: Metadata = { title: "ESG Intelligence (Preview) — Products" };

/** PREVIEW — no backend. Illustrative fixture signal rows. */

const SIGNALS: [string, string, string][] = [
  ["SFDR classification changes", "Article 8/9 reclassifications across the tracked fund shelf", "Quarterly"],
  ["Transition-plan disclosures", "Portfolio-company climate plans referenced in filings", "As filed"],
  ["Controversy watch", "Court, regulator and press signals tagged to holdings", "Live"],
  ["Stewardship activity", "Engagement and voting records where disclosed", "Annual"],
  ["Carbon intensity of real-asset books", "Register + disclosure-derived estimates with source trails", "Annual"],
];

export default function EsgPage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-8">
      <div className="type-label">Products</div>
      <h1 className="type-display mt-2">ESG Intelligence</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        Sustainability signals across the record — provenance-first, extraction-only. No scores
        without sources; no proprietary black-box ratings.
      </p>
      <div className="mt-5">
        <PreviewBanner product="ESG Intelligence" />
      </div>

      <div className="mt-6 border border-line">
        {SIGNALS.map(([name, desc, cadence]) => (
          <div key={name} className="flex items-baseline gap-4 border-b border-line bg-surface px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="type-h3">{name}</div>
              <div className="type-small mt-0.5 text-ink-secondary">{desc}</div>
            </div>
            <span className="type-mono shrink-0 text-ink-muted">{cadence.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <p className="type-mono mt-3 text-ink-muted">
        AT LAUNCH: SIGNALS JOIN THE FEED WITH CLASS ACCENTS AND CITATION RAILS, FILTERED PER
        WATCHLIST
      </p>
    </div>
  );
}

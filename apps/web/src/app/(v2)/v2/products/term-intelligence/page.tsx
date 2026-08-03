import type { Metadata } from "next";
import { PreviewBanner } from "@/components/v2/products/preview-banner";

export const metadata: Metadata = { title: "Term Intelligence (Preview) — Products" };

/** PREVIEW — no backend. Illustrative fixture terms only. */

const TERMS: [string, string, string, string, string, string][] = [
  ["Buyouts (mid-market)", "2.0%", "20%", "8%", "2–3%", "10 + 2y"],
  ["Growth equity", "1.8%", "20%", "7%", "1–2%", "10 + 2y"],
  ["Venture capital", "2.0–2.5%", "20–25%", "—", "1%", "10 + 2y"],
  ["Direct lending", "1.25%", "12.5%", "6%", "1–2%", "7 + 1y"],
  ["Distressed / NPL", "1.5%", "17.5%", "8%", "2%", "8 + 2y"],
  ["Secondaries", "1.25%", "12.5%", "8%", "1%", "10y"],
  ["Infrastructure (core)", "1.25%", "10%", "6%", "1%", "12 + 3y"],
  ["CLO equity vehicles", "0.5% + snr fees", "20% over IRR", "12%", "—", "reinv. 4–5y"],
  ["Litigation finance", "2.0%", "20–30%", "10%", "2%", "6 + 2y"],
  ["ILS / cat bonds", "1.0–1.5%", "10–15%", "—", "—", "1–4y notes"],
];

export default function TermIntelligencePage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-8">
      <div className="type-label">Products</div>
      <h1 className="type-display mt-2">Term Intelligence</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        Fund terms and market-standard clauses by strategy — management fees, carry, hurdles, GP
        commitments, fund life — extracted from documents with human review.
      </p>
      <div className="mt-5">
        <PreviewBanner product="Term Intelligence" />
      </div>

      <table className="mt-6 w-full border-collapse border border-line">
        <thead>
          <tr className="border-b border-line-strong bg-surface text-left">
            <th className="type-label px-3 py-2 font-medium">Strategy</th>
            <th className="type-label px-3 py-2 text-right font-medium">Mgmt fee</th>
            <th className="type-label px-3 py-2 text-right font-medium">Carry</th>
            <th className="type-label px-3 py-2 text-right font-medium">Hurdle</th>
            <th className="type-label px-3 py-2 text-right font-medium">GP commit</th>
            <th className="type-label px-3 py-2 text-right font-medium">Term</th>
          </tr>
        </thead>
        <tbody>
          {TERMS.map(([strategy, fee, carry, hurdle, commit, term]) => (
            <tr key={strategy} className="border-b border-line bg-surface transition-colors last:border-b-0 hover:bg-muted/50">
              <td className="type-body px-3 py-2">{strategy}</td>
              <td className="type-data px-3 py-2 text-right">{fee}</td>
              <td className="type-data px-3 py-2 text-right">{carry}</td>
              <td className="type-data px-3 py-2 text-right">{hurdle}</td>
              <td className="type-data px-3 py-2 text-right">{commit}</td>
              <td className="type-data px-3 py-2 text-right">{term}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="type-mono mt-3 text-ink-muted">
        AT LAUNCH: CLAUSE-LEVEL EXTRACTION WITH DOCUMENT CITATIONS AND VINTAGE DRIFT SERIES
      </p>
    </div>
  );
}

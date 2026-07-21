import type { Metadata } from "next";
import { PreviewBanner } from "@/components/v2/products/preview-banner";

export const metadata: Metadata = { title: "Benchmarks (Preview) — Products" };

/** PREVIEW — no backend. Illustrative fixture benchmark rows. */

const VINTAGES: { vintage: string; pe: number; pc: number; ra: number }[] = [
  { vintage: "2016", pe: 16.8, pc: 9.1, ra: 8.4 },
  { vintage: "2017", pe: 15.2, pc: 8.7, ra: 7.9 },
  { vintage: "2018", pe: 14.1, pc: 8.9, ra: 8.8 },
  { vintage: "2019", pe: 17.3, pc: 9.4, ra: 9.2 },
  { vintage: "2020", pe: 19.6, pc: 10.2, ra: 10.1 },
  { vintage: "2021", pe: 11.4, pc: 9.8, ra: 8.6 },
  { vintage: "2022", pe: 9.8, pc: 10.9, ra: 7.2 },
];

function Meter({ value, max, cls }: { value: number; max: number; cls: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full max-w-[160px] bg-muted">
        <div className={`h-2 ${cls}`} style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
      <span className="type-data w-12 text-right">{value.toFixed(1)}%</span>
    </div>
  );
}

export default function BenchmarksPage() {
  const max = 20;
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-8">
      <div className="type-label">Products</div>
      <h1 className="type-display mt-2">Benchmarks</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        Vintage and strategy benchmarks — net IRR quartiles, TVPI/DPI curves, PME comparisons —
        built from the record&apos;s verified fund universe.
      </p>
      <div className="mt-5">
        <PreviewBanner product="Benchmarks" />
      </div>

      <table className="mt-6 w-full border-collapse border border-line">
        <thead>
          <tr className="border-b border-line-strong bg-surface text-left">
            <th className="type-label px-3 py-2 font-medium">Vintage</th>
            <th className="type-label px-3 py-2 font-medium">Private Equity · median net IRR</th>
            <th className="type-label px-3 py-2 font-medium">Private Credit</th>
            <th className="type-label px-3 py-2 font-medium">Real Assets</th>
          </tr>
        </thead>
        <tbody>
          {VINTAGES.map((v) => (
            <tr key={v.vintage} className="border-b border-line bg-surface last:border-b-0">
              <td className="type-data px-3 py-2.5">{v.vintage}</td>
              <td className="px-3 py-2.5"><Meter value={v.pe} max={max} cls="bg-ac-private-equity/70" /></td>
              <td className="px-3 py-2.5"><Meter value={v.pc} max={max} cls="bg-ac-private-credit/70" /></td>
              <td className="px-3 py-2.5"><Meter value={v.ra} max={max} cls="bg-ac-real-assets/70" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="type-mono mt-3 text-ink-muted">
        AT LAUNCH: QUARTILE BANDS, EUROPEAN SUB-REGION CUTS AND PME SERIES WITH METHODOLOGY NOTES
      </p>
    </div>
  );
}

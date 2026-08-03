import type { Metadata } from "next";
import Link from "next/link";
import { EUROPE_COUNTRY_NAMES, MOCK_ENTITIES } from "@continuum/shared";
import { fmtInt } from "@/lib/v2/format";
import { TOTAL_ENTITIES } from "@/lib/v2/coverage";

export const metadata: Metadata = { title: "Coverage density — Universe" };

/**
 * Density across the covered countries: fixture per-country counts summing
 * to the real 30,500 total (real splits wired at cutover), ranked with
 * inline density bars; the mock-set pin count shown alongside for honesty.
 */

function seededCount(code: string): number {
  let h = 0;
  for (const ch of code) {
    h = (h * 131 + ch.charCodeAt(0)) % 100003;
  }
  return 80 + (h % 1000);
}

export default function CoverageMapPage() {
  const codes = Object.keys(EUROPE_COUNTRY_NAMES);
  // Deterministic weights, normalized to the real total; CEE boosted to
  // mirror the platform's stated depth.
  const CEE = new Set(["PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "RS", "BA", "ME", "MK", "AL", "XK", "LT", "LV", "EE", "UA", "MD", "GR", "CY"]);
  const weights = codes.map((c) => seededCount(c) * (CEE.has(c) ? 2.1 : 1));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const rows = codes
    .map((code, i) => ({
      code,
      name: EUROPE_COUNTRY_NAMES[code]!,
      entities: Math.round((TOTAL_ENTITIES * weights[i]!) / weightSum),
      pins: MOCK_ENTITIES.filter((e) => e.country === code).length,
    }))
    .sort((a, b) => b.entities - a.entities);
  const max = rows[0]?.entities ?? 1;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-8">
      <div className="type-label">Universe</div>
      <h1 className="type-display mt-2">Coverage density</h1>
      <p className="type-body mt-3 max-w-[620px] text-ink-secondary">
        Entity coverage across {rows.length} countries. Platform total ({fmtInt(TOTAL_ENTITIES)})
        is real; per-country splits are prototype fixtures until cutover. Deepest coverage by
        design: Central and South-Eastern Europe.
      </p>
      <p className="type-mono mt-2 text-ink-muted">PINS = ENTITIES IN THE MOCK CANVAS SET</p>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b border-line-strong text-left">
            <th className="type-label py-2 pr-3 font-medium">Country</th>
            <th className="type-label w-[40%] py-2 pr-3 font-medium">Density</th>
            <th className="type-label py-2 pr-3 text-right font-medium">Entities</th>
            <th className="type-label py-2 text-right font-medium">Pins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b border-line transition-colors hover:bg-surface">
              <td className="type-body py-2 pr-3">
                <span className="type-mono mr-2 text-ink-muted">{r.code}</span>
                {r.name}
              </td>
              <td className="py-2 pr-3">
                <div className="h-2 w-full bg-muted">
                  <div className="h-2 bg-ac-private-equity/60" style={{ width: `${Math.max(2, Math.round((r.entities / max) * 100))}%` }} />
                </div>
              </td>
              <td className="type-data py-2 pr-3 text-right">{fmtInt(r.entities)}</td>
              <td className="type-data py-2 text-right text-ink-muted">{r.pins > 0 ? r.pins : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Link href="/v2/universe" className="type-label mt-8 inline-block text-ink-secondary transition-colors hover:text-ink">
        ← Back to the Universe map
      </Link>
    </div>
  );
}

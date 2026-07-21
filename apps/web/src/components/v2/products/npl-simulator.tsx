"use client";

import { useMemo, useState } from "react";
import {
  runNplSimulation,
  validateNplParams,
  type NplSimParams,
} from "@continuum/shared";

/**
 * P5 — the REAL NPL simulator ported into v2 styling. Same engine
 * (shared/npl-sim.ts): pure deterministic Monte Carlo — identical params +
 * seed → identical output; all math is code, no LLM near a number. The v2
 * port re-runs live on input change. Production gates this behind founding
 * membership; the prototype runs open with a note.
 */

const DEFAULTS: NplSimParams = {
  nominal: 10_000_000,
  securedShare: 0.6,
  haircutMin: 0.3,
  haircutMax: 0.6,
  unsecuredRecoveryRate: 0.05,
  yearsMin: 1,
  yearsMode: 3,
  yearsMax: 7,
  servicingCostRate: 0.12,
  discountRate: 0.12,
  priceRate: 0.25,
};

const EUR = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
const PCT = (value: number) => `${(value * 100).toFixed(1)}%`;

const FIELDS: { key: keyof NplSimParams; label: string; step: number }[] = [
  { key: "nominal", label: "Portfolio nominal (EUR)", step: 100000 },
  { key: "priceRate", label: "Purchase price (× nominal)", step: 0.01 },
  { key: "securedShare", label: "Secured share", step: 0.05 },
  { key: "haircutMin", label: "Haircut min", step: 0.05 },
  { key: "haircutMax", label: "Haircut max", step: 0.05 },
  { key: "unsecuredRecoveryRate", label: "Unsecured recovery", step: 0.01 },
  { key: "yearsMin", label: "Years min", step: 0.5 },
  { key: "yearsMode", label: "Years mode", step: 0.5 },
  { key: "yearsMax", label: "Years max", step: 0.5 },
  { key: "servicingCostRate", label: "Servicing cost (of gross)", step: 0.01 },
  { key: "discountRate", label: "Discount rate", step: 0.01 },
];

function Histogram({ data }: { data: { from: number; to: number; count: number }[] }) {
  // Token-only SVG: hairline axis, accent bars — no gradients, no shadows.
  const width = 640;
  const height = 180;
  const max = Math.max(...data.map((bin) => bin.count), 1);
  const barWidth = width / data.length;
  return (
    <svg
      viewBox={`0 0 ${width} ${height + 24}`}
      className="mt-3 w-full max-w-2xl"
      role="img"
      aria-label="Distribution of simulated net recovery"
    >
      {data.map((bin, index) => {
        const barHeight = (bin.count / max) * height;
        return (
          <rect
            key={index}
            x={index * barWidth + 1}
            y={height - barHeight}
            width={barWidth - 2}
            height={barHeight}
            fill="currentColor"
            className="text-ac-distressed"
          />
        );
      })}
      <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" strokeWidth="1" className="text-line-strong" />
      <text x="0" y={height + 16} fontSize="11" fill="currentColor" className="text-ink-muted tabular-nums">
        {EUR.format(data[0]?.from ?? 0)}
      </text>
      <text x={width} y={height + 16} fontSize="11" textAnchor="end" fill="currentColor" className="text-ink-muted tabular-nums">
        {EUR.format(data[data.length - 1]?.to ?? 0)}
      </text>
    </svg>
  );
}

export function NplSimulator() {
  const [params, setParams] = useState<NplSimParams>(DEFAULTS);
  const [seed, setSeed] = useState(42);

  const { error, result } = useMemo(() => {
    const validation = validateNplParams(params);
    return {
      error: validation,
      result: validation === null ? runNplSimulation(params, 10_000, seed) : null,
    };
  }, [params, seed]);

  const set = (key: keyof NplSimParams, raw: string) => {
    const value = Number(raw);
    if (Number.isFinite(value)) {
      setParams((p) => ({ ...p, [key]: value }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6">
      <div className="type-label">Products</div>
      <h1 className="type-h1 mt-1">NPL Simulator</h1>
      <p className="type-small mt-1 max-w-[620px] text-ink-secondary">
        Parameterized Monte Carlo over a stated, simple model — 10,000 runs, seedable, fully
        deterministic. Identical inputs always produce identical output; every formula is in the
        open engine.
      </p>
      <p className="type-mono mt-2 text-ink-muted">
        PRODUCTION GATES THIS BEHIND FOUNDING MEMBERSHIP · PROTOTYPE RUNS OPEN · LIVE RE-RUN ON
        EVERY CHANGE
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="type-label block">{f.label}</span>
            <input
              type="number"
              step={f.step}
              value={String(params[f.key])}
              onChange={(e) => set(f.key, e.target.value)}
              className="type-data mt-1 w-full border border-line bg-surface px-2 py-1.5 outline-none focus:border-line-strong"
            />
          </label>
        ))}
        <label className="block">
          <span className="type-label block">Seed (reproducibility)</span>
          <input
            type="number"
            step={1}
            value={String(seed)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) {
                setSeed(Math.trunc(v));
              }
            }}
            className="type-data mt-1 w-full border border-line bg-surface px-2 py-1.5 outline-none focus:border-line-strong"
          />
        </label>
      </div>

      {error !== null ? (
        <p className="type-small mt-4 text-negative">{error}</p>
      ) : result !== null ? (
        <div className="mt-8">
          <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {(
              [
                ["Net recovery P10", EUR.format(result.netRecovery.p10)],
                ["Net recovery P50", EUR.format(result.netRecovery.p50)],
                ["Net recovery P90", EUR.format(result.netRecovery.p90)],
                ["PV P50 (discounted)", EUR.format(result.presentValue.p50)],
                ["IRR P10", PCT(result.irr.p10)],
                ["IRR P50", PCT(result.irr.p50)],
                ["IRR P90", PCT(result.irr.p90)],
                ["Price paid", EUR.format(result.price)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-surface px-4 py-3">
                <div className="type-label">{label}</div>
                <div className="type-data mt-1 text-[20px] leading-7">{value}</div>
              </div>
            ))}
          </div>
          <Histogram data={result.histogram} />
          <p className="type-small mt-1 text-ink-muted">
            Distribution of net (undiscounted) recovery across {result.runs.toLocaleString()} runs ·
            seed {result.seed} — rerun with the same seed for identical output.
          </p>
          <div className="mt-6 max-w-2xl border-t border-line pt-3">
            <h2 className="type-label">Methodology</h2>
            <p className="type-small mt-1.5 leading-[1.6] text-ink-secondary">
              Each run draws a collateral haircut uniformly from your range and a time-to-recovery
              from a triangular distribution. Secured recovery = nominal × secured share × (1 −
              haircut); the unsecured share recovers at your flat rate; servicing costs come off
              gross; present value discounts at your rate over the drawn timeline; IRR treats the
              outcome as a single cash-out at that time against the price paid.
            </p>
            <p className="type-small mt-2 text-ink-muted">
              Illustrative, not investment advice. Real portfolios differ loan by loan.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

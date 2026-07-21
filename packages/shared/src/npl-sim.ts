/**
 * NPL recovery simulator (Phase 34B) — PURE, seedable, deterministic
 * given (params, seed). Monte Carlo over a simple, explicitly-stated
 * model; verified against hand-computed fixtures in verify-intel.
 * All arithmetic is code — the LLM never touches a number here.
 *
 * Model, per run:
 *   haircut  ~ Uniform(haircutMin, haircutMax)
 *   years    ~ Triangular(yearsMin, yearsMode, yearsMax)
 *   secured  = nominal × securedShare × (1 − haircut)
 *   unsec    = nominal × (1 − securedShare) × unsecuredRecoveryRate
 *   gross    = secured + unsec
 *   net      = gross × (1 − servicingCostRate)
 *   pv       = net ÷ (1 + discountRate)^years
 *   irr      = (net ÷ price)^(1/years) − 1        [single cash-out model]
 * Illustrative only — a teaching instrument, not investment advice.
 */

export type NplSimParams = {
  /** Portfolio nominal (face value), EUR. */
  nominal: number;
  /** Share of nominal that is collateral-secured, 0..1. */
  securedShare: number;
  /** Collateral haircut range, 0..1 (min ≤ max). */
  haircutMin: number;
  haircutMax: number;
  /** Recovery rate on the unsecured share, 0..1. */
  unsecuredRecoveryRate: number;
  /** Years-to-recovery triangular distribution. */
  yearsMin: number;
  yearsMode: number;
  yearsMax: number;
  /** Servicing/collection cost as a share of gross recoveries, 0..1. */
  servicingCostRate: number;
  /** Annual discount rate for PV, 0..1. */
  discountRate: number;
  /** Purchase price as a share of nominal, 0..1 (IRR needs a price). */
  priceRate: number;
};

export type NplSimResult = {
  runs: number;
  seed: number;
  price: number;
  netRecovery: { p10: number; p50: number; p90: number; mean: number };
  presentValue: { p10: number; p50: number; p90: number; mean: number };
  irr: { p10: number; p50: number; p90: number };
  /** Histogram of net recovery, `bins` equal-width buckets. */
  histogram: { from: number; to: number; count: number }[];
};

/** mulberry32 — tiny, seedable, good-enough PRNG for illustration. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inverse-CDF triangular sample from one uniform draw. */
export function triangularSample(u: number, min: number, mode: number, max: number): number {
  if (max <= min) {
    return min;
  }
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index]!;
}

export function validateNplParams(params: NplSimParams): string | null {
  if (!(params.nominal > 0)) {
    return "nominal must be positive";
  }
  for (const [key, value] of Object.entries(params)) {
    if (!Number.isFinite(value)) {
      return `${key} must be a number`;
    }
  }
  const shares: [string, number][] = [
    ["securedShare", params.securedShare],
    ["haircutMin", params.haircutMin],
    ["haircutMax", params.haircutMax],
    ["unsecuredRecoveryRate", params.unsecuredRecoveryRate],
    ["servicingCostRate", params.servicingCostRate],
  ];
  for (const [key, value] of shares) {
    if (value < 0 || value > 1) {
      return `${key} must be between 0 and 1`;
    }
  }
  if (params.haircutMax < params.haircutMin) {
    return "haircut range inverted";
  }
  if (params.discountRate < 0 || params.discountRate > 0.5) {
    return "discount rate must be 0–0.5";
  }
  if (!(params.priceRate > 0) || params.priceRate > 1) {
    return "price must be >0 and ≤100% of nominal";
  }
  if (
    params.yearsMin <= 0 ||
    params.yearsMode < params.yearsMin ||
    params.yearsMax < params.yearsMode ||
    params.yearsMax > 30
  ) {
    return "years must satisfy 0 < min ≤ mode ≤ max ≤ 30";
  }
  return null;
}

export function runNplSimulation(
  params: NplSimParams,
  runs = 10_000,
  seed = 42,
  bins = 24,
): NplSimResult {
  const rand = mulberry32(seed);
  const price = params.nominal * params.priceRate;
  const nets: number[] = [];
  const pvs: number[] = [];
  const irrs: number[] = [];

  for (let i = 0; i < runs; i++) {
    const haircut = params.haircutMin + (params.haircutMax - params.haircutMin) * rand();
    const years = triangularSample(rand(), params.yearsMin, params.yearsMode, params.yearsMax);
    const secured = params.nominal * params.securedShare * (1 - haircut);
    const unsecured = params.nominal * (1 - params.securedShare) * params.unsecuredRecoveryRate;
    const net = (secured + unsecured) * (1 - params.servicingCostRate);
    nets.push(net);
    pvs.push(net / Math.pow(1 + params.discountRate, years));
    irrs.push(Math.pow(net / price, 1 / years) - 1);
  }

  nets.sort((a, b) => a - b);
  pvs.sort((a, b) => a - b);
  irrs.sort((a, b) => a - b);
  const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

  const lo = nets[0]!;
  const hi = nets[nets.length - 1]!;
  const width = hi > lo ? (hi - lo) / bins : 1;
  const histogram = Array.from({ length: bins }, (_, index) => ({
    from: lo + index * width,
    to: lo + (index + 1) * width,
    count: 0,
  }));
  for (const net of nets) {
    const index = Math.min(bins - 1, Math.floor((net - lo) / width));
    histogram[index]!.count += 1;
  }

  return {
    runs,
    seed,
    price,
    netRecovery: {
      p10: percentile(nets, 10),
      p50: percentile(nets, 50),
      p90: percentile(nets, 90),
      mean: mean(nets),
    },
    presentValue: {
      p10: percentile(pvs, 10),
      p50: percentile(pvs, 50),
      p90: percentile(pvs, 90),
      mean: mean(pvs),
    },
    irr: { p10: percentile(irrs, 10), p50: percentile(irrs, 50), p90: percentile(irrs, 90) },
    histogram,
  };
}

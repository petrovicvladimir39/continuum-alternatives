import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  runNplSimulation,
  validateNplParams,
  type NplSimParams,
} from "@continuum/shared";
import { getMemberByClerkId, resolveMemberTier, upsertMemberProfile } from "@continuum/db";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/admin/form-styles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NPL recovery simulator",
  robots: { index: false, follow: false },
};

/**
 * /tools/npl-simulator (Phase 34B) — founding-gated analyst tool. PURE
 * deterministic Monte Carlo (shared/npl-sim.ts): same parameters + seed →
 * same output, always. All math is code; no LLM anywhere near a number.
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

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const EUR = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
const PCT = (value: number) => `${(value * 100).toFixed(1)}%`;

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
            className="text-accent"
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

export default async function NplSimulatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    notFound();
  }
  const user = await currentUser();
  if (user === null) {
    notFound(); // middleware redirects; belt-and-braces
  }
  let member = await getMemberByClerkId(user.id);
  if (member === null) {
    member = await upsertMemberProfile({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      displayName: user.firstName ?? null,
    });
  }
  const tier = await resolveMemberTier(member.id);
  if (tier !== "founding") {
    return (
      <div className="max-w-xl py-12">
        <h1 className="type-h1">NPL recovery simulator</h1>
        <p className="mt-3 text-[14px] text-ink-secondary">
          Analyst tools are a founding-member feature.{" "}
          <Link href="/pricing" className="text-accent hover:underline">
            About membership →
          </Link>
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const simParams: NplSimParams = {
    nominal: num(params.nominal, DEFAULTS.nominal),
    securedShare: num(params.secured, DEFAULTS.securedShare),
    haircutMin: num(params.hmin, DEFAULTS.haircutMin),
    haircutMax: num(params.hmax, DEFAULTS.haircutMax),
    unsecuredRecoveryRate: num(params.unsec, DEFAULTS.unsecuredRecoveryRate),
    yearsMin: num(params.ymin, DEFAULTS.yearsMin),
    yearsMode: num(params.ymode, DEFAULTS.yearsMode),
    yearsMax: num(params.ymax, DEFAULTS.yearsMax),
    servicingCostRate: num(params.svc, DEFAULTS.servicingCostRate),
    discountRate: num(params.disc, DEFAULTS.discountRate),
    priceRate: num(params.price, DEFAULTS.priceRate),
  };
  const seed = Math.trunc(num(params.seed, 42));
  const error = validateNplParams(simParams);
  const result = error === null ? runNplSimulation(simParams, 10_000, seed) : null;

  const fields: { name: string; label: string; value: number; step?: string }[] = [
    { name: "nominal", label: "Portfolio nominal (EUR)", value: simParams.nominal, step: "100000" },
    { name: "price", label: "Purchase price (× nominal)", value: simParams.priceRate, step: "0.01" },
    { name: "secured", label: "Secured share", value: simParams.securedShare, step: "0.05" },
    { name: "hmin", label: "Haircut min", value: simParams.haircutMin, step: "0.05" },
    { name: "hmax", label: "Haircut max", value: simParams.haircutMax, step: "0.05" },
    { name: "unsec", label: "Unsecured recovery", value: simParams.unsecuredRecoveryRate, step: "0.01" },
    { name: "ymin", label: "Years min", value: simParams.yearsMin, step: "0.5" },
    { name: "ymode", label: "Years mode", value: simParams.yearsMode, step: "0.5" },
    { name: "ymax", label: "Years max", value: simParams.yearsMax, step: "0.5" },
    { name: "svc", label: "Servicing cost (of gross)", value: simParams.servicingCostRate, step: "0.01" },
    { name: "disc", label: "Discount rate", value: simParams.discountRate, step: "0.01" },
    { name: "seed", label: "Seed (reproducibility)", value: seed, step: "1" },
  ];

  return (
    <div className="py-10">
      <h1 className="type-h1">NPL recovery simulator</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-[1.6] text-ink-secondary">
        Parameterized Monte Carlo over a stated, simple model — 10,000 runs, seedable, fully
        deterministic. <Link href="/tools/comps" className="text-accent hover:underline">Comps →</Link>
      </p>

      <form method="get" action="/tools/npl-simulator" className="mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className={labelClass}>{field.label}</span>
            <input
              name={field.name}
              type="number"
              step={field.step}
              defaultValue={String(field.value)}
              className={inputClass}
            />
          </label>
        ))}
        <div className="col-span-2 flex items-end sm:col-span-4">
          <Button type="submit">Run 10,000 simulations</Button>
        </div>
      </form>

      {error !== null ? (
        <p className="mt-4 text-[13px] text-distressed">{error}</p>
      ) : result !== null ? (
        <div className="mt-8 max-w-3xl">
          <div className="flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
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
              <div key={label}>
                <div className="type-data text-[20px] font-medium">{value}</div>
                <div className="type-label mt-1">{label}</div>
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
            <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-secondary">
              Each run draws a collateral haircut uniformly from your range and a time-to-recovery
              from a triangular distribution. Secured recovery = nominal × secured share × (1 −
              haircut); the unsecured share recovers at your flat rate; servicing costs come off
              gross; present value discounts at your rate over the drawn timeline; IRR treats the
              outcome as a single cash-out at that time against the price paid. Every formula is in
              the open-source engine — nothing is estimated for you.
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

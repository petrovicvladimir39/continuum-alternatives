import { classifiedLabel } from "@continuum/shared";

/**
 * THE ONLY FILE where class accents touch markup (Phase 27A usage law).
 * Three sanctioned slots — kicker text, 2px top rule, class chip
 * (border+text). Class accents NEVER paint backgrounds, fills, headlines,
 * buttons, or links; verify-editorial greps the codebase for violations.
 * One template, nine accents — no per-class typefaces or layouts.
 */

const CLASS_VAR: Record<string, string> = {
  private_equity: "var(--color-class-private-equity)",
  private_credit: "var(--color-class-private-credit)",
  real_assets: "var(--color-class-real-assets)",
  hedge_funds: "var(--color-class-hedge-funds)",
  structured: "var(--color-class-structured)",
  esoteric: "var(--color-class-esoteric)",
  collectibles: "var(--color-class-collectibles)",
  climate: "var(--color-class-climate)",
  digital: "var(--color-class-digital)",
};

export function classAccent(assetClass: string | null): string | null {
  return assetClass === null ? null : (CLASS_VAR[assetClass] ?? null);
}

/** Slot 1 — kicker: "ASSET CLASS · Strategy" above a headline. */
export function ClassKicker({
  assetClass,
  strategy,
}: {
  assetClass: string | null;
  strategy: string | null;
}) {
  const accent = classAccent(assetClass);
  if (accent === null || assetClass === null) {
    return null; // neutral articles carry no slot — never a default color
  }
  return (
    <p
      className="text-[11px] font-medium uppercase tracking-[0.08em]"
      style={{ color: accent }}
    >
      {classifiedLabel(assetClass, strategy)}
    </p>
  );
}

/** Slot 2 — 2px top rule on article cards / lead blocks. */
export function ClassTopRule({ assetClass }: { assetClass: string | null }) {
  const accent = classAccent(assetClass);
  if (accent === null) {
    return null;
  }
  return <div aria-hidden className="h-[2px] w-full" style={{ backgroundColor: accent }} />;
}

/** Slot 3 — class chip: border + text in the accent, surface stays neutral. */
export function ClassChip({
  assetClass,
  strategy,
}: {
  assetClass: string | null;
  strategy: string | null;
}) {
  const accent = classAccent(assetClass);
  if (accent === null || assetClass === null) {
    return null;
  }
  return (
    <span
      className="inline-block rounded-sm border px-1.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: accent, color: accent }}
    >
      {classifiedLabel(assetClass, strategy)}
    </span>
  );
}

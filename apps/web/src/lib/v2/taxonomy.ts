import { ALT_TAXONOMY, type AssetClassDef } from "@continuum/shared";

/**
 * FRONTEND-V2 taxonomy adapter — the platform's organizing spine, rendered.
 * Maps the canonical ALT_TAXONOMY (underscore slugs) to v2 URL slugs
 * (dashed), display labels, and the accent utility classes for each of the
 * NINE asset classes. Class strings are literal so the Tailwind scanner
 * sees them; never compose accent classes dynamically.
 *
 * USAGE LAW: accents appear ONLY in 4px left-border indicator slots, chips,
 * 2px top rules, and map/graph encodings.
 */

export type V2AssetClass = {
  /** v2 URL slug — /v2/markets/[slug]. */
  slug: string;
  /** Canonical taxonomy slug (underscore) in @continuum/shared. */
  taxonomySlug: string;
  label: string;
  /** Two/three-letter ticker-style code for dense chips. */
  code: string;
  /** One-line desk description for mastheads. */
  desk: string;
  accent: {
    text: string;
    /** 4px left-border indicator slot. */
    left: string;
    /** 2px top rule. */
    top: string;
    /** Quiet tinted chip: hairline + text in the class hue. */
    chip: string;
    /** Tinted fill for map/graph swatches and specimen blocks. */
    fill: string;
    /** Solid swatch (styleguide, map legends). */
    swatch: string;
    /** Raw CSS var reference for canvas/deck.gl/recharts encodings. */
    cssVar: string;
  };
};

const CLASS_META: Record<
  string,
  { slug: string; code: string; desk: string; accent: V2AssetClass["accent"] }
> = {
  private_equity: {
    slug: "private-equity",
    code: "PE",
    desk: "Buyouts, growth, venture and secondaries across the European mid-market and beyond.",
    accent: {
      text: "text-ac-private-equity",
      left: "border-l-4 border-l-ac-private-equity",
      top: "border-t-2 border-t-ac-private-equity",
      chip: "border border-ac-private-equity/40 text-ac-private-equity",
      fill: "bg-ac-private-equity/10",
      swatch: "bg-ac-private-equity",
      cssVar: "var(--color-ac-private-equity)",
    },
  },
  private_credit: {
    slug: "private-credit",
    code: "PC",
    desk: "Direct lending, distressed debt and the NPL machine — Europe's credit engine room.",
    accent: {
      text: "text-ac-private-credit",
      left: "border-l-4 border-l-ac-private-credit",
      top: "border-t-2 border-t-ac-private-credit",
      chip: "border border-ac-private-credit/40 text-ac-private-credit",
      fill: "bg-ac-private-credit/10",
      swatch: "bg-ac-private-credit",
      cssVar: "var(--color-ac-private-credit)",
    },
  },
  real_assets: {
    slug: "real-assets",
    code: "RA",
    desk: "Real estate, infrastructure, natural resources and commodities — the tangible book.",
    accent: {
      text: "text-ac-real-assets",
      left: "border-l-4 border-l-ac-real-assets",
      top: "border-t-2 border-t-ac-real-assets",
      chip: "border border-ac-real-assets/40 text-ac-real-assets",
      fill: "bg-ac-real-assets/10",
      swatch: "bg-ac-real-assets",
      cssVar: "var(--color-ac-real-assets)",
    },
  },
  hedge_funds: {
    slug: "hedge-funds",
    code: "HF",
    desk: "Long/short, macro, quant and arbitrage — the liquid end of the alternatives book.",
    accent: {
      text: "text-ac-hedge-funds",
      left: "border-l-4 border-l-ac-hedge-funds",
      top: "border-t-2 border-t-ac-hedge-funds",
      chip: "border border-ac-hedge-funds/40 text-ac-hedge-funds",
      fill: "bg-ac-hedge-funds/10",
      swatch: "bg-ac-hedge-funds",
      cssVar: "var(--color-ac-hedge-funds)",
    },
  },
  structured: {
    slug: "structured",
    code: "SC",
    desk: "CLOs, ABS and mortgage credit — securitisation across the capital stack.",
    accent: {
      text: "text-ac-structured",
      left: "border-l-4 border-l-ac-structured",
      top: "border-t-2 border-t-ac-structured",
      chip: "border border-ac-structured/40 text-ac-structured",
      fill: "bg-ac-structured/10",
      swatch: "bg-ac-structured",
      cssVar: "var(--color-ac-structured)",
    },
  },
  esoteric: {
    slug: "esoteric",
    code: "ES",
    desk: "Litigation finance, royalties, leasing and life settlements — specialty capital.",
    accent: {
      text: "text-ac-esoteric",
      left: "border-l-4 border-l-ac-esoteric",
      top: "border-t-2 border-t-ac-esoteric",
      chip: "border border-ac-esoteric/40 text-ac-esoteric",
      fill: "bg-ac-esoteric/10",
      swatch: "bg-ac-esoteric",
      cssVar: "var(--color-ac-esoteric)",
    },
  },
  collectibles: {
    slug: "collectibles",
    code: "CO",
    desk: "Fine art, wine and hard collectibles — passion assets with institutional wrappers.",
    accent: {
      text: "text-ac-collectibles",
      left: "border-l-4 border-l-ac-collectibles",
      top: "border-t-2 border-t-ac-collectibles",
      chip: "border border-ac-collectibles/40 text-ac-collectibles",
      fill: "bg-ac-collectibles/10",
      swatch: "bg-ac-collectibles",
      cssVar: "var(--color-ac-collectibles)",
    },
  },
  climate: {
    slug: "climate",
    code: "CL",
    desk: "Carbon markets, cat bonds and ILS — climate and insurance-linked capital.",
    accent: {
      text: "text-ac-climate",
      left: "border-l-4 border-l-ac-climate",
      top: "border-t-2 border-t-ac-climate",
      chip: "border border-ac-climate/40 text-ac-climate",
      fill: "bg-ac-climate/10",
      swatch: "bg-ac-climate",
      cssVar: "var(--color-ac-climate)",
    },
  },
  digital: {
    slug: "digital",
    code: "DA",
    desk: "Crypto, tokenized real-world assets and compute infrastructure.",
    accent: {
      text: "text-ac-digital",
      left: "border-l-4 border-l-ac-digital",
      top: "border-t-2 border-t-ac-digital",
      chip: "border border-ac-digital/40 text-ac-digital",
      fill: "bg-ac-digital/10",
      swatch: "bg-ac-digital",
      cssVar: "var(--color-ac-digital)",
    },
  },
};

/** Crimson NPL/Distressed strategy-variant accent (within Private Credit). */
export const DISTRESSED_ACCENT: V2AssetClass["accent"] = {
  text: "text-ac-distressed",
  left: "border-l-4 border-l-ac-distressed",
  top: "border-t-2 border-t-ac-distressed",
  chip: "border border-ac-distressed/40 text-ac-distressed",
  fill: "bg-ac-distressed/10",
  swatch: "bg-ac-distressed",
  cssVar: "var(--color-ac-distressed)",
};

/** Strategy slugs that take the crimson distressed variant. */
const DISTRESSED_STRATEGIES = new Set(["npl", "distressed_debt"]);

export const V2_CLASSES: V2AssetClass[] = ALT_TAXONOMY.map((c: AssetClassDef) => {
  const meta = CLASS_META[c.slug];
  if (meta === undefined) {
    throw new Error(`v2 taxonomy adapter missing class meta for ${c.slug}`);
  }
  return { taxonomySlug: c.slug, label: c.label, ...meta };
});

const BY_SLUG = new Map(V2_CLASSES.map((c) => [c.slug, c]));
const BY_TAXONOMY_SLUG = new Map(V2_CLASSES.map((c) => [c.taxonomySlug, c]));

export function v2ClassBySlug(slug: string): V2AssetClass | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Accepts either slug form (mock entities use dashed, taxonomy underscore). */
export function v2ClassFor(anySlug: string | null | undefined): V2AssetClass | null {
  if (!anySlug) {
    return null;
  }
  return BY_SLUG.get(anySlug) ?? BY_TAXONOMY_SLUG.get(anySlug) ?? null;
}

/** Class accent, honoring the crimson NPL/Distressed strategy variant. */
export function v2Accent(
  anyClassSlug: string | null | undefined,
  strategySlug?: string | null,
): V2AssetClass["accent"] | null {
  if (strategySlug && DISTRESSED_STRATEGIES.has(strategySlug)) {
    return DISTRESSED_ACCENT;
  }
  const cls = v2ClassFor(anyClassSlug);
  return cls?.accent ?? null;
}

export function v2StrategiesFor(classSlug: string): { slug: string; label: string }[] {
  const cls = v2ClassBySlug(classSlug) ?? v2ClassFor(classSlug);
  if (cls === null) {
    return [];
  }
  const def = ALT_TAXONOMY.find((c) => c.slug === cls.taxonomySlug);
  return def === undefined ? [] : def.strategies.map((s) => ({ slug: s.slug, label: s.label }));
}

/** Total strategy count across the nine classes (the coverage grid axis). */
export const V2_STRATEGY_COUNT: number = ALT_TAXONOMY.reduce(
  (n, c) => n + c.strategies.length,
  0,
);

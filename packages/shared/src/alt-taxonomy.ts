/**
 * The full alternatives taxonomy (Phase 26A) — the constitution amendment.
 * Asset classes → strategies; synonyms feed the Ask parser. NOTE: the phase
 * prompt says "8 asset classes" but enumerates NINE — the enumeration is
 * authoritative, so nine are modeled (documented deviation).
 *
 * Class-level classification is legitimate where strategy is unknown:
 * entity_classifications uses strategy = '' (CLASS_LEVEL sentinel) with a
 * composite pk (entity_id, asset_class, strategy) so an entity may hold
 * class-level rows in several classes.
 */

export const CLASS_LEVEL = "";

export type StrategyDef = {
  slug: string;
  label: string;
  synonyms: string[];
};

export type AssetClassDef = {
  slug: string;
  label: string;
  /** Synonyms that resolve to the CLASS (strategy = class-level). */
  synonyms: string[];
  strategies: StrategyDef[];
};

export const ALT_TAXONOMY: AssetClassDef[] = [
  {
    slug: "private_equity",
    label: "Private Equity",
    synonyms: ["private equity", "pe funds"],
    strategies: [
      { slug: "venture_capital", label: "Venture Capital", synonyms: ["venture capital", "vc funds", "early stage"] },
      { slug: "growth_equity", label: "Growth Equity", synonyms: ["growth equity", "growth capital"] },
      { slug: "lbo", label: "Buyouts", synonyms: ["buyout", "buyouts", "lbo", "leveraged buyout"] },
      { slug: "mezzanine", label: "Mezzanine", synonyms: ["mezzanine", "mezz"] },
      { slug: "secondaries", label: "Secondaries", synonyms: ["secondaries", "secondary market", "gp-led"] },
    ],
  },
  {
    slug: "private_credit",
    label: "Private Credit",
    synonyms: ["private credit", "private debt"],
    strategies: [
      { slug: "direct_lending", label: "Direct Lending", synonyms: ["direct lending", "senior lending", "unitranche"] },
      { slug: "distressed_debt", label: "Distressed Debt", synonyms: ["distressed debt", "special situations debt", "workout debt"] },
      { slug: "npl", label: "NPL", synonyms: ["npl", "npls", "non-performing loans", "loan portfolios"] },
      { slug: "venture_debt", label: "Venture Debt", synonyms: ["venture debt", "growth debt"] },
      { slug: "re_debt", label: "Real Estate Debt", synonyms: ["real estate debt", "property debt", "re debt"] },
      { slug: "revenue_based", label: "Revenue-Based Finance", synonyms: ["revenue based", "revenue-based financing", "rbf"] },
    ],
  },
  {
    slug: "real_assets",
    label: "Real Assets",
    synonyms: ["real assets"],
    strategies: [
      { slug: "re_core_income", label: "Core Real Estate", synonyms: ["core real estate", "income real estate", "real estate income"] },
      { slug: "re_value_add_opportunistic", label: "Value-Add & Opportunistic RE", synonyms: ["value add", "opportunistic real estate", "value-add real estate"] },
      { slug: "infrastructure_economic", label: "Economic Infrastructure", synonyms: ["infrastructure", "economic infrastructure", "transport infrastructure", "energy infrastructure"] },
      { slug: "infrastructure_social", label: "Social Infrastructure", synonyms: ["social infrastructure", "schools hospitals", "ppp"] },
      { slug: "natural_resources", label: "Natural Resources", synonyms: ["natural resources", "farmland", "timber", "timberland", "agriculture"] },
      { slug: "commodities", label: "Commodities", synonyms: ["commodities", "commodity trading"] },
    ],
  },
  {
    slug: "hedge_funds",
    label: "Hedge Funds",
    synonyms: ["hedge fund", "hedge funds"],
    strategies: [
      { slug: "long_short_equity", label: "Long/Short Equity", synonyms: ["long short", "long/short equity", "equity hedge"] },
      { slug: "market_neutral", label: "Market Neutral", synonyms: ["market neutral", "equity market neutral"] },
      { slug: "quant", label: "Quantitative", synonyms: ["quant", "quantitative", "systematic"] },
      { slug: "merger_arbitrage", label: "Merger Arbitrage", synonyms: ["merger arbitrage", "merger arb", "event driven"] },
      { slug: "distressed_arbitrage", label: "Distressed Arbitrage", synonyms: ["distressed arbitrage", "distressed arb"] },
      { slug: "global_macro", label: "Global Macro", synonyms: ["global macro", "macro fund", "macro funds"] },
      { slug: "cta", label: "CTA / Managed Futures", synonyms: ["cta", "managed futures", "trend following"] },
      { slug: "fixed_income_arb", label: "Fixed Income Arbitrage", synonyms: ["fixed income arbitrage", "fixed income arb", "rates arbitrage"] },
      { slug: "convertible_arb", label: "Convertible Arbitrage", synonyms: ["convertible arbitrage", "convertible arb", "convertibles"] },
    ],
  },
  {
    slug: "structured",
    label: "Structured Credit",
    synonyms: ["structured credit", "securitization", "securitisation"],
    strategies: [
      { slug: "clo", label: "CLO", synonyms: ["clo", "clos", "collateralized loan obligation", "loan obligations"] },
      { slug: "cdo", label: "CDO", synonyms: ["cdo", "cdos", "collateralized debt obligation"] },
      { slug: "abs", label: "ABS", synonyms: ["abs", "asset-backed securities", "asset backed"] },
      { slug: "cmbs", label: "CMBS", synonyms: ["cmbs", "commercial mortgage-backed", "commercial mortgage backed"] },
      { slug: "rmbs", label: "RMBS", synonyms: ["rmbs", "residential mortgage-backed", "residential mortgage backed"] },
    ],
  },
  {
    slug: "esoteric",
    label: "Esoteric",
    synonyms: ["esoteric assets", "specialty finance"],
    strategies: [
      { slug: "litigation_finance", label: "Litigation Finance", synonyms: ["litigation finance", "litigation funding", "legal finance"] },
      { slug: "ip_royalties", label: "IP & Royalties", synonyms: ["royalties", "music royalties", "ip royalties", "royalty funds", "pharma royalties"] },
      { slug: "transport_leasing", label: "Transport Leasing", synonyms: ["aircraft leasing", "shipping finance", "transport leasing", "rolling stock"] },
      { slug: "life_settlements", label: "Life Settlements", synonyms: ["life settlements", "life settlement", "viaticals"] },
    ],
  },
  {
    slug: "collectibles",
    label: "Collectibles",
    synonyms: ["collectibles", "passion assets"],
    strategies: [
      { slug: "fine_art", label: "Fine Art", synonyms: ["fine art", "art funds", "art investment"] },
      { slug: "wine_spirits", label: "Wine & Spirits", synonyms: ["wine", "fine wine", "whisky casks", "spirits investment"] },
      { slug: "hard_collectibles", label: "Hard Collectibles", synonyms: ["classic cars", "watches", "rare coins", "memorabilia"] },
    ],
  },
  {
    slug: "climate",
    label: "Climate & Insurance",
    synonyms: ["climate finance"],
    strategies: [
      { slug: "carbon_markets", label: "Carbon Markets", synonyms: ["carbon markets", "carbon credits", "emissions trading"] },
      { slug: "ils_cat_bonds", label: "Cat Bonds & ILS", synonyms: ["cat bonds", "cat bond", "ils", "insurance-linked securities", "insurance linked", "reinsurance risk"] },
    ],
  },
  {
    slug: "digital",
    label: "Digital Assets",
    synonyms: ["digital assets"],
    strategies: [
      { slug: "crypto", label: "Crypto", synonyms: ["crypto", "cryptocurrency", "digital currency"] },
      { slug: "tokenized_rwa", label: "Tokenized RWA", synonyms: ["tokenized", "tokenization", "rwa", "tokenized rwa", "real world assets"] },
      { slug: "compute_infrastructure", label: "Compute Infrastructure", synonyms: ["compute infrastructure", "data centers", "data centres", "gpu capacity"] },
    ],
  },
];

export function assetClassBySlug(slug: string): AssetClassDef | null {
  return ALT_TAXONOMY.find((c) => c.slug === slug) ?? null;
}

export function strategyBySlug(
  slug: string,
): { assetClass: AssetClassDef; strategy: StrategyDef } | null {
  for (const assetClass of ALT_TAXONOMY) {
    const strategy = assetClass.strategies.find((s) => s.slug === slug);
    if (strategy !== undefined) {
      return { assetClass, strategy };
    }
  }
  return null;
}

/** "Climate & Insurance · Cat Bonds & ILS" — chip/kicker label form. */
export function classifiedLabel(assetClassSlug: string, strategySlug: string | null): string {
  const assetClass = assetClassBySlug(assetClassSlug);
  if (assetClass === null) {
    return assetClassSlug;
  }
  if (strategySlug === null || strategySlug === CLASS_LEVEL) {
    return assetClass.label;
  }
  const strategy = assetClass.strategies.find((s) => s.slug === strategySlug);
  return strategy === undefined ? assetClass.label : `${assetClass.label} · ${strategy.label}`;
}

/**
 * Deterministic ENTITY_TAGS → taxonomy map (Phase 26B). Applied
 * status='approved', source='tag_map' — the tags themselves were curated or
 * register-derived, so the mapping inherits that standing.
 */
export const TAG_TAXONOMY_MAP: Record<string, { assetClass: string; strategy: string }> = {
  gp_vc: { assetClass: "private_equity", strategy: "venture_capital" },
  gp_pe: { assetClass: "private_equity", strategy: CLASS_LEVEL },
  gp_secondaries: { assetClass: "private_equity", strategy: "secondaries" },
  gp_search_fund: { assetClass: "private_equity", strategy: "lbo" },
  gp_credit: { assetClass: "private_credit", strategy: "direct_lending" },
  gp_distressed: { assetClass: "private_credit", strategy: "distressed_debt" },
  servicer: { assetClass: "private_credit", strategy: "npl" },
  state_amc: { assetClass: "private_credit", strategy: "npl" },
  bank_workout_unit: { assetClass: "private_credit", strategy: "npl" },
  non_bank_lender: { assetClass: "private_credit", strategy: "direct_lending" },
  gp_re: { assetClass: "real_assets", strategy: CLASS_LEVEL },
  gp_infra: { assetClass: "real_assets", strategy: "infrastructure_economic" },
  hedge_fund: { assetClass: "hedge_funds", strategy: CLASS_LEVEL },
};

/**
 * Keyword rules for the proposal pass (Phase 26B) — matches NEVER
 * auto-approve; they land status='proposed', source='keyword' in the review
 * queue. Patterns are lowercase substrings unless wordBoundary (then matched
 * as a whole word).
 */
export type KeywordRule = {
  pattern: string;
  wordBoundary?: boolean;
  assetClass: string;
  strategy: string;
};

export const KEYWORD_RULES: KeywordRule[] = [
  { pattern: "real estate", assetClass: "real_assets", strategy: CLASS_LEVEL },
  { pattern: "immobili", assetClass: "real_assets", strategy: CLASS_LEVEL },
  { pattern: "infrastructure", assetClass: "real_assets", strategy: "infrastructure_economic" },
  { pattern: "farmland", assetClass: "real_assets", strategy: "natural_resources" },
  { pattern: "timber", assetClass: "real_assets", strategy: "natural_resources" },
  { pattern: "agricultur", assetClass: "real_assets", strategy: "natural_resources" },
  { pattern: "commodit", assetClass: "real_assets", strategy: "commodities" },
  { pattern: "mezzanine", assetClass: "private_equity", strategy: "mezzanine" },
  { pattern: "secondar", assetClass: "private_equity", strategy: "secondaries" },
  { pattern: "venture debt", assetClass: "private_credit", strategy: "venture_debt" },
  { pattern: "royalt", assetClass: "esoteric", strategy: "ip_royalties" },
  { pattern: "litigation", assetClass: "esoteric", strategy: "litigation_finance" },
  { pattern: "aircraft leas", assetClass: "esoteric", strategy: "transport_leasing" },
  { pattern: "life settlement", assetClass: "esoteric", strategy: "life_settlements" },
  { pattern: "carbon", assetClass: "climate", strategy: "carbon_markets" },
  { pattern: "insurance-linked", assetClass: "climate", strategy: "ils_cat_bonds" },
  { pattern: "cat bond", assetClass: "climate", strategy: "ils_cat_bonds" },
  { pattern: "clo", wordBoundary: true, assetClass: "structured", strategy: "clo" },
  { pattern: "securitis", assetClass: "structured", strategy: CLASS_LEVEL },
  { pattern: "securitiz", assetClass: "structured", strategy: CLASS_LEVEL },
  { pattern: "crypto", assetClass: "digital", strategy: "crypto" },
  { pattern: "digital asset", assetClass: "digital", strategy: "crypto" },
  { pattern: "tokeniz", assetClass: "digital", strategy: "tokenized_rwa" },
  { pattern: "data cent", assetClass: "digital", strategy: "compute_infrastructure" },
  { pattern: "hedge", assetClass: "hedge_funds", strategy: CLASS_LEVEL },
  { pattern: "global macro", assetClass: "hedge_funds", strategy: "global_macro" },
  { pattern: "quantitative", assetClass: "hedge_funds", strategy: "quant" },
  { pattern: "fine art", assetClass: "collectibles", strategy: "fine_art" },
  { pattern: "fine wine", assetClass: "collectibles", strategy: "wine_spirits" },
];

/**
 * Coverage render threshold (Phase 26C): a strategy (or class-level front)
 * appears in Markets ▾ / gets a front when it clears this. Below it, the
 * strategy exists only on /coverage as "Building".
 */
export function meetsCoverageThreshold(coverage: { entities: number; signals: number }): boolean {
  return coverage.entities >= 15 || coverage.signals >= 10;
}

/**
 * Strategy → front URL. The four curated Phase 25 fronts ARE the taxonomy
 * fronts for their strategies (PE/VC/Credit/Distressed map cleanly; the
 * LP & Vendors fronts stay channel-based — they are audiences, not asset
 * classes). Cleared strategies without a curated home get the generic
 * taxonomy front at /markets/<strategy_slug> (underscore namespace — no
 * collision with the dashed curated slugs).
 */
export function frontHrefFor(assetClassSlug: string, strategySlug: string): string {
  const curated: Record<string, string> = {
    "private_equity:": "/markets/private-equity",
    "private_equity:lbo": "/markets/private-equity",
    "private_equity:growth_equity": "/markets/private-equity",
    "private_equity:venture_capital": "/markets/venture-capital",
    "private_credit:": "/markets/private-credit",
    "private_credit:direct_lending": "/markets/private-credit",
    "private_credit:distressed_debt": "/markets/distressed",
    "private_credit:npl": "/markets/distressed",
  };
  const key = `${assetClassSlug}:${strategySlug}`;
  return curated[key] ?? `/markets/${strategySlug === CLASS_LEVEL ? assetClassSlug : strategySlug}`;
}

/** Old free-text fund strategy → taxonomy slug (Phase 26A migration map). */
export function mapLegacyFundStrategy(raw: string): string | null {
  const value = raw.toLowerCase();
  if (/buyout|lbo/.test(value)) return "lbo";
  if (/venture|seed|early/.test(value)) return "venture_capital";
  if (/growth/.test(value)) return "growth_equity";
  if (/mezz/.test(value)) return "mezzanine";
  if (/secondar/.test(value)) return "secondaries";
  if (/distress|special sit|npl|workout/.test(value)) return "distressed_debt";
  if (/direct lend|senior|unitranche|private credit|private debt|credit|debt/.test(value))
    return "direct_lending";
  if (/infrastruct/.test(value)) return "infrastructure_economic";
  if (/real estate|property/.test(value)) return "re_core_income";
  return null;
}

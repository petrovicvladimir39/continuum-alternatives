/**
 * EUROPE DEPTH RUN — the four-level classification spine (constitution §2,
 * run-prompt verbatim). Level 1 asset class → Level 2 sub-class → Level 3/4
 * niche/strategy. Classification is DETERMINISTIC (legal form, NACE, register
 * category, licence type, keyword maps → proposed to review); Level-1-only is
 * valid when deeper detail is unknown; NEVER force-fit — unclassifiable stays
 * unclassified. The regionally-labelled L3 strategies are strategy labels
 * applied wherever they genuinely fit; they do NOT imply regional focus.
 *
 * entity_classifications storage: asset_class = L1 slug, sub_class = L2 slug
 * (derived, non-key), strategy = L3 slug ('' sentinel = class-level).
 */

export type EuropeL2 = {
  slug: string;
  label: string;
  strategies: { slug: string; label: string }[];
};

export type EuropeL1 = {
  slug: string;
  label: string;
  subClasses: EuropeL2[];
};

export const EUROPE_TAXONOMY: EuropeL1[] = [
  {
    slug: "pe_growth",
    label: "Private Equity & Growth",
    subClasses: [
      {
        slug: "buyout",
        label: "Buyout",
        strategies: [
          { slug: "large_cap", label: "Large-Cap" },
          { slug: "mid_market", label: "Mid-Market" },
          { slug: "small_cap", label: "Small-Cap" },
          { slug: "cee_buyout_mid_market", label: "CEE Buyout Mid-Market" },
        ],
      },
      {
        slug: "venture_capital",
        label: "Venture Capital",
        strategies: [
          { slug: "seed_pre_seed", label: "Seed / Pre-Seed" },
          { slug: "series_a_c", label: "Series A–C" },
          { slug: "late_stage", label: "Late-Stage" },
          { slug: "cee_tech_seed", label: "CEE Tech Seed" },
        ],
      },
      {
        slug: "growth_equity",
        label: "Growth Equity",
        strategies: [
          { slug: "non_control_growth", label: "Non-Control Growth" },
          { slug: "pre_ipo", label: "Pre-IPO" },
        ],
      },
      {
        slug: "secondaries",
        label: "Secondaries",
        strategies: [
          { slug: "lp_secondaries", label: "LP Secondaries" },
          { slug: "gp_led_secondaries", label: "GP-Led Secondaries" },
          { slug: "continuation_funds", label: "Continuation Funds" },
        ],
      },
    ],
  },
  {
    slug: "private_debt",
    label: "Private Debt & Credit",
    subClasses: [
      {
        slug: "direct_lending",
        label: "Direct Lending",
        strategies: [
          { slug: "senior_secured", label: "Senior Secured" },
          { slug: "unitranche", label: "Unitranche" },
          { slug: "mezzanine", label: "Mezzanine" },
        ],
      },
      {
        slug: "distressed_special_situations",
        label: "Distressed & Special Situations",
        strategies: [
          { slug: "distressed_debt_control", label: "Distressed Debt Control" },
          { slug: "turnaround", label: "Turnaround" },
          { slug: "special_situations", label: "Special Situations" },
        ],
      },
      {
        slug: "npl",
        label: "Non-Performing Loans (NPLs)",
        strategies: [
          { slug: "corporate_npls", label: "Corporate NPLs" },
          { slug: "residential_npls_reo", label: "Residential NPLs / REO" },
          { slug: "secured_npls", label: "Secured NPLs" },
          { slug: "unsecured_npls", label: "Unsecured NPLs" },
          { slug: "cee_npl_servicing", label: "CEE NPL Servicing" },
          { slug: "unsecured_consumer_cee", label: "Unsecured Consumer CEE" },
        ],
      },
      {
        slug: "venture_debt",
        label: "Venture Debt",
        strategies: [
          { slug: "seed_series_a_lending", label: "Seed / Series A Lending" },
          { slug: "late_stage_venture_debt", label: "Late-Stage Venture Debt" },
        ],
      },
      {
        slug: "asset_backed_lending",
        label: "Asset-Backed Lending",
        strategies: [
          { slug: "real_estate_debt", label: "Real Estate Debt" },
          { slug: "trade_finance", label: "Trade Finance" },
          { slug: "supply_chain_finance", label: "Supply Chain Finance" },
        ],
      },
    ],
  },
  {
    slug: "real_assets",
    label: "Real Assets & Infrastructure",
    subClasses: [
      {
        slug: "private_real_estate",
        label: "Private Real Estate",
        strategies: [
          { slug: "core_core_plus", label: "Core / Core-Plus" },
          { slug: "value_add", label: "Value-Add" },
          { slug: "opportunistic", label: "Opportunistic" },
          { slug: "npl_real_estate_reo", label: "NPL Real Estate / REO" },
          { slug: "cee_logistics", label: "CEE Logistics" },
        ],
      },
      {
        slug: "infrastructure",
        label: "Infrastructure",
        strategies: [
          { slug: "economic", label: "Economic" },
          { slug: "digital", label: "Digital" },
          { slug: "social", label: "Social" },
        ],
      },
      {
        slug: "energy_transition",
        label: "Energy Transition",
        strategies: [
          { slug: "renewables", label: "Renewables" },
          { slug: "battery_storage", label: "Battery Storage" },
          { slug: "carbon_capture", label: "Carbon Capture" },
          { slug: "green_hydrogen_spvs", label: "Green Hydrogen SPVs" },
        ],
      },
      {
        slug: "natural_resources",
        label: "Natural Resources",
        strategies: [
          { slug: "agriculture_farmland", label: "Agriculture / Farmland" },
          { slug: "timberland", label: "Timberland" },
          { slug: "mining", label: "Mining" },
          { slug: "sustainable_agri_cee", label: "Sustainable Agri CEE" },
        ],
      },
    ],
  },
  {
    slug: "liquid_alts",
    label: "Liquid Alternatives & Hedge Funds",
    subClasses: [
      {
        slug: "equity_strategies",
        label: "Equity Strategies",
        strategies: [
          { slug: "long_short_equity", label: "Long/Short Equity" },
          { slug: "equity_market_neutral", label: "Equity Market Neutral" },
        ],
      },
      {
        slug: "macro_cta",
        label: "Macro & CTA",
        strategies: [
          { slug: "global_macro", label: "Global Macro" },
          { slug: "managed_futures", label: "Managed Futures" },
        ],
      },
      {
        slug: "event_driven",
        label: "Event-Driven",
        strategies: [
          { slug: "merger_arbitrage", label: "Merger Arbitrage" },
          { slug: "liquid_distressed_securities", label: "Liquid Distressed Securities" },
          { slug: "activist", label: "Activist" },
        ],
      },
      {
        slug: "relative_value",
        label: "Relative Value",
        strategies: [
          { slug: "fixed_income_arbitrage", label: "Fixed Income Arbitrage" },
          { slug: "volatility_arbitrage", label: "Volatility Arbitrage" },
        ],
      },
    ],
  },
  {
    slug: "niche_alts",
    label: "Niche & Emerging Alternatives",
    subClasses: [
      {
        slug: "litigation_finance",
        label: "Litigation Finance",
        strategies: [
          { slug: "commercial_litigation", label: "Commercial Litigation" },
          { slug: "consumer_class_action", label: "Consumer Class Action" },
        ],
      },
      {
        slug: "royalties_ip",
        label: "Royalties & IP",
        strategies: [
          { slug: "music_royalties", label: "Music Royalties" },
          { slug: "pharmaceutical_patent_royalties", label: "Pharmaceutical Patent Royalties" },
        ],
      },
      {
        slug: "carbon_markets",
        label: "Carbon Markets",
        strategies: [
          { slug: "compliance_carbon_credits", label: "Compliance Carbon Credits" },
          { slug: "voluntary_carbon_offsets", label: "Voluntary Carbon Offsets" },
        ],
      },
      {
        slug: "digital_assets",
        label: "Digital Assets",
        strategies: [
          { slug: "tokenized_rwa", label: "Tokenized Real World Assets" },
          { slug: "crypto_asset_funds", label: "Crypto-Asset Funds" },
          { slug: "tokenized_cee_real_estate", label: "Tokenized CEE Real Estate" },
        ],
      },
    ],
  },
  {
    slug: "service_graph",
    label: "Institutional Service Graph",
    subClasses: [
      {
        slug: "fund_administration",
        label: "Fund Administration",
        strategies: [
          { slug: "administrator", label: "Administrator" },
          { slug: "registrar", label: "Registrar" },
          { slug: "cee_local_administrator", label: "CEE Local Administrator" },
        ],
      },
      {
        slug: "legal_advisory",
        label: "Legal & Advisory",
        strategies: [
          { slug: "structuring_law_firm", label: "Structuring Law Firm" },
          { slug: "ma_advisor", label: "M&A Advisor" },
          { slug: "regulatory_compliance", label: "Regulatory Compliance" },
          { slug: "insolvency_practitioner", label: "Insolvency Practitioner" },
        ],
      },
      {
        slug: "asset_servicing",
        label: "Asset Servicing",
        strategies: [
          { slug: "npl_servicer", label: "NPL Servicer" },
          { slug: "special_servicer", label: "Special Servicer" },
          { slug: "property_manager", label: "Property Manager" },
          { slug: "custodian", label: "Custodian" },
        ],
      },
      {
        slug: "technology",
        label: "Technology",
        strategies: [
          { slug: "fintech", label: "FinTech" },
          { slug: "data_provider", label: "Data Provider" },
          { slug: "valuation_provider", label: "Valuation Provider" },
        ],
      },
    ],
  },
];

export const EUROPE_L1_SLUGS = EUROPE_TAXONOMY.map((c) => c.slug);

/** L3 strategy slug -> its L2 sub-class slug (L3 uniquely determines L2). */
const STRATEGY_TO_SUBCLASS = new Map<string, { l1: string; l2: string }>();
/** L2 slug -> L1 slug. */
const SUBCLASS_TO_L1 = new Map<string, string>();
for (const l1 of EUROPE_TAXONOMY) {
  for (const l2 of l1.subClasses) {
    SUBCLASS_TO_L1.set(l2.slug, l1.slug);
    for (const s of l2.strategies) {
      STRATEGY_TO_SUBCLASS.set(s.slug, { l1: l1.slug, l2: l2.slug });
    }
  }
}

export function subClassForStrategy(strategySlug: string): { l1: string; l2: string } | undefined {
  return STRATEGY_TO_SUBCLASS.get(strategySlug);
}

export function l1ForSubClass(subClassSlug: string): string | undefined {
  return SUBCLASS_TO_L1.get(subClassSlug);
}

/**
 * Legacy ALT_TAXONOMY (nine-class, Phase 26A) asset-class slug -> the
 * six-category Level-1 spine, for coverage reporting across old + new rows.
 * CLO/structured vehicles sit under Private Debt (prompt: "SPVs / CLOs" are
 * debt-side entity types); climate (carbon/ILS) and digital are Niche.
 */
export const LEGACY_CLASS_TO_L1: Record<string, string> = {
  private_equity: "pe_growth",
  private_credit: "private_debt",
  real_assets: "real_assets",
  hedge_funds: "liquid_alts",
  structured: "private_debt",
  esoteric: "niche_alts",
  climate: "niche_alts",
  digital: "niche_alts",
  service_graph: "service_graph",
};

export type EuropeClassification = {
  l1: string;
  l2?: string;
  l3?: string;
  /** GP|LP|ManCo|Fund Vehicle|SPV|Servicer|Advisor|Vendor|Portfolio Co|Regulator */
  role?: string;
};

/**
 * Deterministic keyword classifier over register category / licence type /
 * legal-form strings (multilingual). Returns undefined when nothing matches —
 * NEVER force-fits. First match wins; patterns ordered most-specific first.
 * Used by register adapters to propose classifications (source 'register').
 */
const LICENCE_PATTERNS: { re: RegExp; c: EuropeClassification }[] = [
  // — fund administration / depositary / custody (service graph) —
  { re: /fund administr|administrateur de fonds|depositar|depositary|custod/i, c: { l1: "service_graph", l2: "asset_servicing", role: "Vendor" } },
  { re: /transfer agent|registrar agent/i, c: { l1: "service_graph", l2: "fund_administration", l3: "registrar", role: "Vendor" } },
  // — NPL / debt servicing / collection —
  { re: /credit servic|npl|non.?performing|debt collect|collection agency|servicer|inkasso|windykac|vym[aá]h|izterj|napla[tć]/i, c: { l1: "private_debt", l2: "npl", role: "Servicer" } },
  { re: /insolvency|insolvenz|st[eč]aj|upravitel|liquidator|faillite|administrateur judiciaire/i, c: { l1: "service_graph", l2: "legal_advisory", l3: "insolvency_practitioner", role: "Advisor" } },
  // — pensions / insurance (the LP side) — BEFORE ManCo patterns: pension
  // management companies ("dôchodková správcovská…") contain ManCo substrings.
  { re: /pension|penzij|pokojnin|mirovinsk|nyugd[ií]j|emeklilik|eläke|pensioen|dôchodk/i, c: { l1: "service_graph", role: "LP" } },
  { re: /insurance|versicherung|assurance|osiguran|poist|ubezpiecz|biztos[ií]t|vakuutus|zavaroval/i, c: { l1: "service_graph", role: "LP" } },
  // — venture / PE managers —
  { re: /venture capital|risikokapital|rizi[čc]n[iy].{0,3}kapital|eu ?veca|seed|kockázati/i, c: { l1: "pe_growth", l2: "venture_capital", role: "GP" } },
  { re: /private equity|beteiligungsgesellschaft|capital.?investissement/i, c: { l1: "pe_growth", role: "GP" } },
  // — private debt managers (association/directory self-labels) —
  { re: /private debt|private credit|direct lending|kreditfonds|debt fund/i, c: { l1: "private_debt", role: "GP" } },
  // — liquid alternatives (BAI-style directory labels) —
  { re: /liquide? alternatives/i, c: { l1: "liquid_alts", role: "ManCo" } },
  // — AIFM / ManCo / UCITS (liquid alts / fund management) —
  { re: /aifm|alternative investment fund manager|gestor.{0,4}fia|verwalter alternativer/i, c: { l1: "liquid_alts", role: "ManCo" } },
  { re: /ucits|oga[wv]|sicav|management compan|soci[eé]t[eé] de gestion|kapitalverwaltungsgesellschaft|fondsmaatschappij|t[aá]rsas[aá]g.{0,10}alapkezel|towarzystwo funduszy|sprá[vw]covsk|fondbolag|forvaltningsselskap|rahastoyhti/i, c: { l1: "liquid_alts", role: "ManCo" } },
  { re: /hedge fund|absolute return/i, c: { l1: "liquid_alts", role: "Fund Vehicle" } },
  // — real estate / infrastructure —
  { re: /real estate fund|immobilienfond|immobilien|fonds immobilier|nekretnin|nieruchomo[sś]|ingatlan/i, c: { l1: "real_assets", l2: "private_real_estate", role: "Fund Vehicle" } },
  { re: /reit|real estate investment trust/i, c: { l1: "real_assets", l2: "private_real_estate", role: "Fund Vehicle" } },
  { re: /infrastructure fund|infrastruktur/i, c: { l1: "real_assets", l2: "infrastructure", role: "Fund Vehicle" } },
  // — generic directory service labels —
  { re: /service provider|dienstleister/i, c: { l1: "service_graph", role: "Vendor" } },
  { re: /institutional investor|investor \(lp\)|versorgungswerk|family office/i, c: { l1: "service_graph", role: "LP" } },
  // — crypto / MiCA —
  { re: /crypto.?asset|casp|mica|virtual asset|virtual currenc|digital asset/i, c: { l1: "niche_alts", l2: "digital_assets", role: "ManCo" } },
  // — litigation funding —
  { re: /litigation fund|prozessfinanz|financement de contentieux/i, c: { l1: "niche_alts", l2: "litigation_finance", role: "GP" } },
  // — investment firms / brokers (service graph technology-adjacent; broad) —
  { re: /investment firm|wertpapierinstitut|entreprise d.investissement|beleggingsonderneming|empresa de servicios de inversi[oó]n|investi[cč]n[ií] spole[cč]nost|dom maklerski|befektet[eé]si v[aá]llalkoz/i, c: { l1: "service_graph", role: "Advisor" } },
];

export function classifyFromLicence(text: string): EuropeClassification | undefined {
  const t = text.trim();
  if (t === "") {
    return undefined;
  }
  for (const { re, c } of LICENCE_PATTERNS) {
    if (re.test(t)) {
      return c;
    }
  }
  return undefined;
}

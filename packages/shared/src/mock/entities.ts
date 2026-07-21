/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY.
 *
 * Realistic-but-fictional European alternative-assets entities used to
 * design and build surfaces as they will look WITH data. Never seeded into
 * the database, never rendered unless MOCK_MODE is on (see ./index.ts).
 * Names are invented; any resemblance to real firms is stylistic.
 *
 * FRONTEND-V2 expansion: ~124 entities across ALL NINE taxonomy asset
 * classes and 25+ European countries, with coordinates (universe map),
 * AUM figures (deterministic fixtures — no LLM arithmetic anywhere),
 * taxonomy strategy slugs and verification tiers.
 */

export type MockEntity = {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string;
  kind: "organization" | "fund_vehicle" | "deal";
  /** v2/dashed asset-class slug (matches --color-ac-* tokens + v2 routes). */
  assetClass:
    | "private-equity"
    | "private-credit"
    | "real-assets"
    | "hedge-funds"
    | "structured"
    | "esoteric"
    | "collectibles"
    | "climate"
    | "digital";
  /** Display strategy text (chips, context lines). */
  strategy: string;
  /** Canonical taxonomy strategy slug ("" = class-level). */
  strategySlug: string;
  role: "gp" | "fund" | "lp" | "lender" | "servicer" | "advisor" | "company" | "regulator";
  /** AUM / GBV / book size in €m; null where not meaningful. */
  aumM: number | null;
  /** Map coordinates (city centroid with a deterministic jitter). */
  lat: number;
  lng: number;
  /** Mock domain for favicon-style logo avatars; monogram fallback. */
  domain: string | null;
  /** Verification tier shown as register badges. */
  tier: "verified" | "register" | "monitored";
};

const CITY: Record<string, [number, number]> = {
  Warsaw: [52.2297, 21.0122], Kraków: [50.0647, 19.945], Katowice: [50.2649, 19.0238],
  Berlin: [52.52, 13.405], Frankfurt: [50.1109, 8.6821], Munich: [48.1351, 11.582], Hamburg: [53.5511, 9.9937],
  Paris: [48.8566, 2.3522], Lyon: [45.764, 4.8357], Amsterdam: [52.3676, 4.9041], Leiden: [52.1601, 4.497],
  Milan: [45.4642, 9.19], Turin: [45.0703, 7.6869], Naples: [40.8518, 14.2681], Rome: [41.9028, 12.4964],
  Stockholm: [59.3293, 18.0686], Gothenburg: [57.7089, 11.9746], Vienna: [48.2082, 16.3738], Innsbruck: [47.2692, 11.4041],
  Madrid: [40.4168, -3.7038], Barcelona: [41.3874, 2.1686], Bucharest: [44.4268, 26.1025], Cluj: [46.7712, 23.6236],
  Zagreb: [45.815, 15.9819], Split: [43.5081, 16.4402], Vilnius: [54.6872, 25.2797], Riga: [56.9496, 24.1052],
  Tallinn: [59.437, 24.7536], Zurich: [47.3769, 8.5417], Geneva: [46.2044, 6.1432], Prague: [50.0755, 14.4378],
  Brno: [49.1951, 16.6068], Copenhagen: [55.6761, 12.5683], Aarhus: [56.1629, 10.2039], Budapest: [47.4979, 19.0402],
  Belgrade: [44.7866, 20.4489], "Novi Sad": [45.2671, 19.8335], Lisbon: [38.7223, -9.1393], Porto: [41.1579, -8.6291],
  Athens: [37.9838, 23.7275], Thessaloniki: [40.6401, 22.9444], Oslo: [59.9139, 10.7522], Dublin: [53.3498, -6.2603],
  Helsinki: [60.1699, 24.9384], Bratislava: [48.1486, 17.1077], Sofia: [42.6977, 23.3219], Ljubljana: [46.0569, 14.5058],
  Luxembourg: [49.6116, 6.1319], Brussels: [50.8503, 4.3517], London: [51.5074, -0.1278], Valletta: [35.8989, 14.5146],
  Nicosia: [35.1856, 33.3823], Sarajevo: [43.8563, 18.4131], Skopje: [41.9973, 21.428], Tirana: [41.3275, 19.8187],
};

const TRANSLIT: Record<string, string> = {
  ø: "o", æ: "ae", å: "a", ä: "a", ö: "o", ü: "u", ß: "ss", é: "e", è: "e",
  ê: "e", á: "a", à: "a", â: "a", í: "i", ì: "i", ó: "o", ò: "o", ú: "u",
  ù: "u", ç: "c", ñ: "n", ł: "l", ż: "z", ź: "z", ś: "s", ę: "e", ą: "a",
  č: "c", ć: "c", š: "s", ž: "z", ő: "o", ű: "u", ř: "r", ě: "e", ý: "y",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\x20-\x7e]/g, (ch) => TRANSLIT[ch] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

let seq = 0;
function entity(
  name: string,
  country: string,
  city: string,
  assetClass: MockEntity["assetClass"],
  strategy: string,
  strategySlug: string,
  role: MockEntity["role"],
  aumM: number | null,
  opts: { kind?: MockEntity["kind"]; tier?: MockEntity["tier"]; domain?: string | null } = {},
): MockEntity {
  const id = ++seq;
  const base = CITY[city];
  if (base === undefined) {
    throw new Error(`mock city missing coordinates: ${city}`);
  }
  // Deterministic jitter so co-located pins don't stack exactly.
  const jLat = ((id * 37) % 100) / 2500 - 0.02;
  const jLng = ((id * 61) % 100) / 2000 - 0.025;
  return {
    id: `mock-e-${id}`,
    name,
    slug: slugify(name),
    country,
    city,
    kind: opts.kind ?? "organization",
    assetClass,
    strategy,
    strategySlug,
    role,
    aumM,
    lat: base[0] + jLat,
    lng: base[1] + jLng,
    domain: opts.domain === undefined ? `${slugify(name).replace(/-/g, "")}.example` : opts.domain,
    tier: opts.tier ?? "register",
  };
}

export const MOCK_ENTITIES: MockEntity[] = [
  // ── PRIVATE EQUITY — GPs (ids 1..12 preserved order for stability) ───────
  entity("Vistula Growth Partners", "PL", "Warsaw", "private-equity", "Buyouts", "lbo", "gp", 2400, { tier: "verified" }),
  entity("Hanseatic Capital Management", "DE", "Berlin", "private-equity", "Buyouts", "lbo", "gp", 3100, { tier: "verified" }),
  entity("Rive Gauche Capital", "FR", "Paris", "private-equity", "Growth Equity", "growth_equity", "gp", 1850, { tier: "verified" }),
  entity("Grachten Equity Partners", "NL", "Amsterdam", "private-equity", "Buyouts", "lbo", "gp", 2750),
  entity("Navigli Ventures", "IT", "Milan", "private-equity", "Venture Capital", "venture_capital", "gp", 640, { tier: "verified" }),
  entity("Norrström Capital", "SE", "Stockholm", "private-equity", "Growth Equity", "growth_equity", "gp", 1200),
  entity("Pannonia Equity", "HU", "Budapest", "private-equity", "Buyouts", "lbo", "gp", 420),
  entity("Atlas Lisboa Partners", "PT", "Lisbon", "private-equity", "Growth Equity", "growth_equity", "gp", 510),
  entity("Liffey Growth Equity", "IE", "Dublin", "private-equity", "Growth Equity", "growth_equity", "gp", 890),
  entity("Moravia Mid-Cap Partners", "CZ", "Brno", "private-equity", "Buyouts", "lbo", "gp", 380),
  entity("Sprea Secondaries Group", "DE", "Frankfurt", "private-equity", "Secondaries", "secondaries", "gp", 4100, { tier: "verified" }),
  entity("Illyria Capital", "AL", "Tirana", "private-equity", "Lower Mid-Market", "lbo", "gp", 140, { tier: "monitored" }),
  // ── PE — funds & portfolio companies ─────────────────────────────────────
  entity("Vistula Growth Fund IX", "PL", "Warsaw", "private-equity", "Buyouts", "lbo", "fund", 850, { kind: "fund_vehicle" }),
  entity("Navigli Ventures Fund IV", "IT", "Milan", "private-equity", "Venture Capital", "venture_capital", "fund", 300, { kind: "fund_vehicle" }),
  entity("Sprea Secondaries Fund II", "DE", "Frankfurt", "private-equity", "Secondaries", "secondaries", "fund", 1600, { kind: "fund_vehicle" }),
  entity("Norrström Growth Fund III", "SE", "Stockholm", "private-equity", "Growth Equity", "growth_equity", "fund", 560, { kind: "fund_vehicle" }),
  entity("Silesia Logistics Group", "PL", "Katowice", "private-equity", "Portfolio Company", "", "company", null),
  entity("Alpenmilch Dairy Holding", "AT", "Innsbruck", "private-equity", "Portfolio Company", "", "company", null),
  entity("Tulip BioMedical", "NL", "Leiden", "private-equity", "Portfolio Company", "", "company", null),
  entity("Vesuvio Foods S.p.A.", "IT", "Naples", "private-equity", "Portfolio Company", "", "company", null),
  entity("Kalevala Gaming Studios", "FI", "Helsinki", "digital", "Portfolio Company", "", "company", null),
  entity("Danubia MedTech", "HU", "Budapest", "private-equity", "Portfolio Company", "", "company", null),
  entity("Adriatic Shipyards Group", "HR", "Split", "private-equity", "Portfolio Company", "", "company", null),
  entity("Baltic Grain Terminals", "LV", "Riga", "real-assets", "Portfolio Company", "", "company", null),
  // ── PRIVATE CREDIT — GPs, lenders, servicers, advisors ───────────────────
  entity("Danube Credit Partners", "AT", "Vienna", "private-credit", "Direct Lending", "direct_lending", "gp", 1100, { tier: "verified" }),
  entity("Iberia Special Situations", "ES", "Madrid", "private-credit", "Distressed Debt", "distressed_debt", "gp", 760, { tier: "verified" }),
  entity("Carpathian Debt Advisors", "RO", "Bucharest", "private-credit", "NPL", "npl", "gp", 540),
  entity("Adria Distressed Opportunities", "HR", "Zagreb", "private-credit", "Distressed Debt", "distressed_debt", "gp", 380),
  entity("Sava Capital Group", "RS", "Belgrade", "private-credit", "NPL", "npl", "gp", 290),
  entity("Aegean Yield Partners", "GR", "Athens", "private-credit", "NPL", "npl", "gp", 830, { tier: "verified" }),
  entity("Vltava Private Debt", "CZ", "Prague", "private-credit", "Direct Lending", "direct_lending", "gp", 460),
  entity("Griffin Venture Debt", "IE", "Dublin", "private-credit", "Venture Debt", "venture_debt", "gp", 310),
  entity("Meuse Real Estate Credit", "BE", "Brussels", "private-credit", "Real Estate Debt", "re_debt", "gp", 690),
  entity("Skaldic Revenue Partners", "NO", "Oslo", "private-credit", "Revenue-Based Finance", "revenue_based", "gp", 120, { tier: "monitored" }),
  entity("Danube Direct Lending Fund III", "AT", "Vienna", "private-credit", "Direct Lending", "direct_lending", "fund", 520, { kind: "fund_vehicle" }),
  entity("Aegean NPL Recovery Fund II", "GR", "Athens", "private-credit", "NPL", "npl", "fund", 400, { kind: "fund_vehicle" }),
  entity("Iberia Special Situations Fund IV", "ES", "Madrid", "private-credit", "Distressed Debt", "distressed_debt", "fund", 350, { kind: "fund_vehicle" }),
  entity("Wawel Merchant Bank", "PL", "Kraków", "private-credit", "Leveraged Finance", "direct_lending", "lender", null, { tier: "verified" }),
  entity("Ambra Banca Popolare", "IT", "Turin", "private-credit", "NPL Seller", "npl", "lender", null),
  entity("Douro Savings Bank", "PT", "Porto", "private-credit", "NPL Seller", "npl", "lender", null),
  entity("Balkan United Bank", "BG", "Sofia", "private-credit", "NPL Seller", "npl", "lender", null),
  entity("Meridian Loan Servicing", "ES", "Barcelona", "private-credit", "Servicing", "npl", "servicer", 12400, { tier: "verified" }),
  entity("Hellas Asset Resolution", "GR", "Thessaloniki", "private-credit", "Servicing", "npl", "servicer", 8600),
  entity("Drina Recovery Services", "BA", "Sarajevo", "private-credit", "Servicing", "npl", "servicer", 950, { tier: "monitored" }),
  entity("Tatra Restructuring Advisors", "SK", "Bratislava", "private-credit", "Restructuring", "distressed_debt", "advisor", null),
  entity("Amstel Corporate Finance", "NL", "Amsterdam", "private-equity", "M&A Advisory", "", "advisor", null),
  entity("Limmat Debt Advisory", "CH", "Zurich", "private-credit", "Debt Advisory", "direct_lending", "advisor", null),
  // ── REAL ASSETS ──────────────────────────────────────────────────────────
  entity("Baltic Bridge Infrastructure", "LT", "Vilnius", "real-assets", "Economic Infrastructure", "infrastructure_economic", "gp", 980, { tier: "verified" }),
  entity("Vindobona Real Estate Partners", "AT", "Vienna", "real-assets", "Core Real Estate", "re_core_income", "gp", 2300),
  entity("Sarmatia Farmland Holdings", "PL", "Warsaw", "real-assets", "Natural Resources", "natural_resources", "gp", 450),
  entity("Dalmatia Hospitality Assets", "HR", "Split", "real-assets", "Value-Add & Opportunistic RE", "re_value_add_opportunistic", "gp", 380),
  entity("Nordlicht Social Infra", "DE", "Hamburg", "real-assets", "Social Infrastructure", "infrastructure_social", "gp", 720),
  entity("Ebro Water & Roads", "ES", "Madrid", "real-assets", "Economic Infrastructure", "infrastructure_economic", "gp", 1500),
  entity("Karpaty Timberland Fund", "RO", "Cluj", "real-assets", "Natural Resources", "natural_resources", "fund", 260, { kind: "fund_vehicle" }),
  entity("Baltic Bridge Infra Fund I", "LT", "Vilnius", "real-assets", "Economic Infrastructure", "infrastructure_economic", "fund", 430, { kind: "fund_vehicle" }),
  entity("Attika Logistics Parks", "GR", "Athens", "real-assets", "Value-Add & Opportunistic RE", "re_value_add_opportunistic", "company", null),
  entity("Bohemia Commodity Trading", "CZ", "Prague", "real-assets", "Commodities", "commodities", "gp", 340),
  // ── HEDGE FUNDS ──────────────────────────────────────────────────────────
  entity("Øresund Quant Capital", "DK", "Copenhagen", "hedge-funds", "Quantitative", "quant", "gp", 1900, { tier: "verified" }),
  entity("Helvetia Macro Advisors", "CH", "Geneva", "hedge-funds", "Global Macro", "global_macro", "gp", 2600, { tier: "verified" }),
  entity("Thames Event Partners", "GB", "London", "hedge-funds", "Merger Arbitrage", "merger_arbitrage", "gp", 1400),
  entity("Vasa Long/Short", "SE", "Stockholm", "hedge-funds", "Long/Short Equity", "long_short_equity", "gp", 760),
  entity("Piraeus Distressed Arbitrage", "GR", "Athens", "hedge-funds", "Distressed Arbitrage", "distressed_arbitrage", "gp", 310),
  entity("Wenceslas Market Neutral", "CZ", "Prague", "hedge-funds", "Market Neutral", "market_neutral", "gp", 280),
  entity("Boreal CTA Systems", "FI", "Helsinki", "hedge-funds", "CTA / Managed Futures", "cta", "gp", 520),
  entity("Chopin Convertible Partners", "PL", "Warsaw", "hedge-funds", "Convertible Arbitrage", "convertible_arb", "gp", 190, { tier: "monitored" }),
  entity("Lemanic Fixed Income Arb", "CH", "Geneva", "hedge-funds", "Fixed Income Arbitrage", "fixed_income_arb", "gp", 640),
  entity("Øresund Systematic Fund", "DK", "Copenhagen", "hedge-funds", "Quantitative", "quant", "fund", 800, { kind: "fund_vehicle" }),
  // ── STRUCTURED CREDIT ────────────────────────────────────────────────────
  entity("Ægir Structured Finance", "DK", "Copenhagen", "structured", "ABS", "abs", "gp", 860, { tier: "verified" }),
  entity("Moselle CLO Management", "LU", "Luxembourg", "structured", "CLO", "clo", "gp", 3200, { tier: "verified" }),
  entity("Tiber Securitisation Partners", "IT", "Rome", "structured", "RMBS", "rmbs", "gp", 1100),
  entity("Escaut Asset Finance", "BE", "Brussels", "structured", "ABS", "abs", "gp", 540),
  entity("Vindel CMBS Advisors", "SE", "Gothenburg", "structured", "CMBS", "cmbs", "gp", 390),
  entity("Moselle CLO XII", "LU", "Luxembourg", "structured", "CLO", "clo", "fund", 400, { kind: "fund_vehicle" }),
  entity("Danubius Auto ABS 2026-1", "AT", "Vienna", "structured", "ABS", "abs", "fund", 320, { kind: "fund_vehicle" }),
  // ── ESOTERIC ─────────────────────────────────────────────────────────────
  entity("Justitia Litigation Capital", "NL", "Amsterdam", "esoteric", "Litigation Finance", "litigation_finance", "gp", 480, { tier: "verified" }),
  entity("Aria Royalty Partners", "GB", "London", "esoteric", "IP & Royalties", "ip_royalties", "gp", 720),
  entity("Adriatic Wings Leasing", "MT", "Valletta", "esoteric", "Transport Leasing", "transport_leasing", "gp", 1300),
  entity("Poseidon Shipping Finance", "CY", "Nicosia", "esoteric", "Transport Leasing", "transport_leasing", "gp", 890),
  entity("Vita Settlement Advisors", "LU", "Luxembourg", "esoteric", "Life Settlements", "life_settlements", "gp", 260, { tier: "monitored" }),
  entity("Karst Pharma Royalties", "SI", "Ljubljana", "esoteric", "IP & Royalties", "ip_royalties", "gp", 180),
  entity("Justitia Claims Fund III", "NL", "Amsterdam", "esoteric", "Litigation Finance", "litigation_finance", "fund", 210, { kind: "fund_vehicle" }),
  // ── COLLECTIBLES ─────────────────────────────────────────────────────────
  entity("Uffizi Art Capital", "IT", "Milan", "collectibles", "Fine Art", "fine_art", "gp", 340, { tier: "verified" }),
  entity("Tokaj Fine Wine Reserve", "HU", "Budapest", "collectibles", "Wine & Spirits", "wine_spirits", "gp", 95),
  entity("Praga Classic Automobilia", "CZ", "Prague", "collectibles", "Hard Collectibles", "hard_collectibles", "gp", 120),
  entity("Montre Genève Horology Fund", "CH", "Geneva", "collectibles", "Hard Collectibles", "hard_collectibles", "fund", 150, { kind: "fund_vehicle" }),
  entity("Alba Whisky Cask Partners", "GB", "London", "collectibles", "Wine & Spirits", "wine_spirits", "gp", 75, { tier: "monitored" }),
  entity("Louvre Rive Art Lending", "FR", "Paris", "collectibles", "Fine Art", "fine_art", "lender", null),
  // ── CLIMATE & INSURANCE ──────────────────────────────────────────────────
  entity("Helvetia Renewables Management", "CH", "Zurich", "climate", "Carbon Markets", "carbon_markets", "gp", 1250, { tier: "verified" }),
  entity("Fjord Green Capital", "NO", "Oslo", "climate", "Carbon Markets", "carbon_markets", "gp", 680, { tier: "verified" }),
  entity("Aeolus Cat Bond Partners", "GR", "Athens", "climate", "Cat Bonds & ILS", "ils_cat_bonds", "gp", 940),
  entity("Polder Re ILS Management", "NL", "Amsterdam", "climate", "Cat Bonds & ILS", "ils_cat_bonds", "gp", 1100),
  entity("Mistral Carbon Exchange", "FR", "Paris", "climate", "Carbon Markets", "carbon_markets", "company", null),
  entity("Helvetia Energy Transition Fund II", "CH", "Zurich", "climate", "Carbon Markets", "carbon_markets", "fund", 600, { kind: "fund_vehicle" }),
  entity("Aeolus Windstorm Bond 2026", "GR", "Athens", "climate", "Cat Bonds & ILS", "ils_cat_bonds", "fund", 200, { kind: "fund_vehicle" }),
  entity("Sava Flood Resilience Note", "RS", "Novi Sad", "climate", "Cat Bonds & ILS", "ils_cat_bonds", "fund", 85, { kind: "fund_vehicle", tier: "monitored" }),
  // ── DIGITAL ASSETS ───────────────────────────────────────────────────────
  entity("Bohemia Digital Ventures", "CZ", "Prague", "digital", "Crypto", "crypto", "gp", 420, { tier: "verified" }),
  entity("Tallinn Token Capital", "EE", "Tallinn", "digital", "Tokenized RWA", "tokenized_rwa", "gp", 260),
  entity("Fjell Compute Partners", "NO", "Oslo", "digital", "Compute Infrastructure", "compute_infrastructure", "gp", 1500),
  entity("Ragusa Digital Assets", "HR", "Zagreb", "digital", "Crypto", "crypto", "gp", 130, { tier: "monitored" }),
  entity("Vardar DataCenter Holdings", "MK", "Skopje", "digital", "Compute Infrastructure", "compute_infrastructure", "company", null),
  entity("Amber Chain Custody", "LT", "Vilnius", "digital", "Tokenized RWA", "tokenized_rwa", "company", null),
  entity("Tallinn RWA Fund I", "EE", "Tallinn", "digital", "Tokenized RWA", "tokenized_rwa", "fund", 110, { kind: "fund_vehicle" }),
  // ── LPs / INSTITUTIONS ───────────────────────────────────────────────────
  entity("Nordwind Pension Alliance", "DE", "Frankfurt", "private-equity", "LP Programme", "", "lp", 48000, { tier: "verified" }),
  entity("Confluence Insurance Group", "FR", "Lyon", "private-credit", "LP Programme", "", "lp", 31000, { tier: "verified" }),
  entity("Polaris Sovereign Partners", "SE", "Stockholm", "real-assets", "LP Programme", "", "lp", 92000, { tier: "verified" }),
  entity("Carinthia Provident Fund", "AT", "Vienna", "private-equity", "LP Programme", "", "lp", 8600),
  entity("Lusitania Mutual Assurance", "PT", "Lisbon", "private-credit", "LP Programme", "", "lp", 5400),
  entity("Piast National Development Fund", "PL", "Warsaw", "real-assets", "LP Programme", "", "lp", 12800),
  entity("Aegis Hellenic Endowment", "GR", "Athens", "hedge-funds", "LP Programme", "", "lp", 2100),
  entity("Viking Family Capital", "DK", "Aarhus", "collectibles", "Family Office", "", "lp", 950, { tier: "monitored" }),
  // ── REGULATORS / SUPERVISORS (map layer) ─────────────────────────────────
  entity("Baltic Financial Supervision Authority", "LT", "Vilnius", "structured", "Supervision", "", "regulator", null, { domain: null }),
  entity("Pannonian Markets Authority", "HU", "Budapest", "hedge-funds", "Supervision", "", "regulator", null, { domain: null }),
  entity("Adriatic Banking Supervisor", "HR", "Zagreb", "private-credit", "Supervision", "", "regulator", null, { domain: null }),
  entity("Iberian Securities Commission", "ES", "Madrid", "structured", "Supervision", "", "regulator", null, { domain: null }),
  entity("Carpathian Financial Authority", "RO", "Bucharest", "private-credit", "Supervision", "", "regulator", null, { domain: null }),
  entity("Nordic Insurance Supervisor", "SE", "Stockholm", "climate", "Supervision", "", "regulator", null, { domain: null }),
];

export const MOCK_ENTITY_BY_ID: ReadonlyMap<string, MockEntity> = new Map(
  MOCK_ENTITIES.map((e) => [e.id, e]),
);

export const MOCK_ENTITY_BY_SLUG: ReadonlyMap<string, MockEntity> = new Map(
  MOCK_ENTITIES.map((e) => [e.slug, e]),
);

/** Distinct countries covered by the mock set (map + coverage surfaces). */
export const MOCK_COUNTRIES: string[] = [...new Set(MOCK_ENTITIES.map((e) => e.country))].sort();

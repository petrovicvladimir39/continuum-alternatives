import type { MockEntity } from "./entities";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. ~15 reports with summaries,
 * tags, page counts and deterministic chart series for the interactive
 * reader. Chart values are fixture constants (no LLM arithmetic).
 */

export type MockReportChart = {
  title: string;
  unit: string;
  series: { label: string; value: number }[];
};

export type MockReport = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  assetClass: MockEntity["assetClass"] | "cross-asset";
  tags: string[];
  pages: number;
  publishedOn: string;
  kind: "quarterly" | "league-table" | "watchdog-brief" | "special";
  /** Optional hero image seed; covers default to typographic. */
  imageSeed: string | null;
  charts: MockReportChart[];
  sections: { heading: string; body: string }[];
};

function report(
  slug: string,
  title: string,
  summary: string,
  assetClass: MockReport["assetClass"],
  tags: string[],
  pages: number,
  publishedOn: string,
  kind: MockReport["kind"],
  charts: MockReportChart[],
  sections: { heading: string; body: string }[],
  imageSeed: string | null = null,
): MockReport {
  return { id: `mock-r-${slug}`, slug, title, summary, assetClass, tags, pages, publishedOn, kind, imageSeed, charts, sections };
}

const QUARTER_LABELS = ["Q3 24", "Q4 24", "Q1 25", "Q2 25", "Q3 25", "Q4 25", "Q1 26", "Q2 26"];

export const MOCK_REPORTS: MockReport[] = [
  report(
    "european-npl-monitor-q2-2026",
    "European NPL Monitor — Q2 2026",
    "Portfolio sales, pricing corridors and servicer capacity across 14 jurisdictions. The southward rotation quantified.",
    "private-credit",
    ["NPL", "Distressed", "Iberia", "CEE"],
    48,
    "2026-07-14",
    "quarterly",
    [
      { title: "Quarterly NPL portfolio sales (GBV)", unit: "€bn", series: QUARTER_LABELS.map((label, i) => ({ label, value: [6.2, 7.8, 5.4, 6.9, 8.1, 9.4, 7.2, 10.3][i]! })) },
      { title: "Average secured pricing by region", unit: "cents", series: [{ label: "Iberia", value: 43 }, { label: "Italy", value: 38 }, { label: "Greece", value: 35 }, { label: "CEE", value: 31 }, { label: "Balkans", value: 26 }] },
    ],
    [
      { heading: "The southward rotation", body: "Iberian sellers accounted for 41% of Q2 GBV, the highest share since 2019. The pipeline suggests the rotation holds through year-end: three Portuguese and two Spanish processes have data rooms open, against one live CEE auction." },
      { heading: "Pricing corridors", body: "Secured corporate books in Portugal cleared in the low forties, several points inside equivalent CEE risk. The spread reflects enforcement-timeline expectations more than collateral quality — Lisbon courts are clearing enforcement actions in under two years." },
      { heading: "Servicer capacity", body: "Servicing capacity is reallocating west. Two major platforms opened Porto offices in the quarter, and Athens-based headcount fell for a third consecutive quarter as Hellenic deleveraging completes." },
    ],
  ),
  report(
    "cee-private-capital-annual-2026",
    "CEE Private Capital — Annual Review 2026",
    "Fundraising, deployment and exits across Central and South-Eastern Europe. The region's first €1bn+ dry-powder cohort.",
    "private-equity",
    ["CEE", "Buyouts", "Fundraising"],
    72,
    "2026-06-30",
    "quarterly",
    [
      { title: "CEE buyout fundraising", unit: "€bn", series: QUARTER_LABELS.map((label, i) => ({ label, value: [0.8, 1.1, 0.6, 1.4, 1.9, 2.3, 1.7, 2.8][i]! })) },
      { title: "Dry powder by country", unit: "€bn", series: [{ label: "PL", value: 3.4 }, { label: "CZ", value: 1.2 }, { label: "RO", value: 0.9 }, { label: "HU", value: 0.7 }, { label: "HR", value: 0.5 }, { label: "RS", value: 0.4 }] },
    ],
    [
      { heading: "A structural re-rating", body: "Three managers now hold more than €1bn each in undeployed capital. CEE vintages 2016-2021 outperform Western European peers across most databases, and allocators are re-cutting Europe sleeves accordingly." },
      { heading: "Exits catch up", body: "Exit value doubled year on year, led by dual-track processes. Strategic buyers from the DACH region were the largest acquirer group, taking eleven of the year's twenty largest exits." },
    ],
  ),
  report(
    "gp-league-tables-h1-2026",
    "European GP League Tables — H1 2026",
    "Fundraising, deal count and exit value ranked across the nine asset classes. Methodology-first, provenance-linked.",
    "cross-asset",
    ["League tables", "Fundraising"],
    36,
    "2026-07-08",
    "league-table",
    [
      { title: "H1 fundraising by asset class", unit: "€bn", series: [{ label: "PE", value: 42.1 }, { label: "PC", value: 31.4 }, { label: "RA", value: 18.9 }, { label: "HF", value: 12.2 }, { label: "SC", value: 9.6 }, { label: "CL", value: 7.4 }, { label: "ES", value: 3.1 }, { label: "DA", value: 2.2 }, { label: "CO", value: 0.8 }] },
    ],
    [
      { heading: "How to read these tables", body: "Rankings aggregate provenance-backed facts only: a close counts when a filing, press release or register entry confirms it. Estimates never rank. Ties break on verified deal count." },
    ],
  ),
  report(
    "regulatory-watchdog-brief-july-2026",
    "Regulatory Watchdog Brief — July 2026",
    "Consultations, enforcement and licensing across European alternatives supervision. MiCA custody queue clears; NPL servicing standards tighten.",
    "cross-asset",
    ["Regulation", "Watchdog"],
    18,
    "2026-07-16",
    "watchdog-brief",
    [
      { title: "Open consultations by topic", unit: "count", series: [{ label: "AIFMD", value: 4 }, { label: "NPL", value: 3 }, { label: "Securitisation", value: 5 }, { label: "Crypto", value: 6 }, { label: "ILS", value: 2 }] },
    ],
    [
      { heading: "The month in supervision", body: "Six crypto-custody authorisations moved through European regulators, clearing a queue that had built since MiCA took effect. NPL servicing standards consultations opened in two Balkan jurisdictions, mirroring the EBA template." },
      { heading: "Enforcement watch", body: "First enforcement of securitisation risk-retention rules against a manager-affiliate structure. The decision signals transaction-level review is replacing annual attestation." },
    ],
  ),
  report(
    "clo-vintage-scorecard-2026",
    "European CLO Vintage Scorecard",
    "Par build, defaults and equity distributions across post-2018 vintages as the refinancing wave crests.",
    "structured",
    ["CLO", "Securitisation"],
    28,
    "2026-06-26",
    "special",
    [
      { title: "Callable share of outstanding by vintage", unit: "%", series: [{ label: "2019", value: 88 }, { label: "2020", value: 74 }, { label: "2021", value: 34 }, { label: "2022", value: 12 }, { label: "2023", value: 4 }] },
      { title: "Annual equity distributions", unit: "%", series: QUARTER_LABELS.map((label, i) => ({ label, value: [11, 12, 14, 15, 13, 16, 17, 18][i]! })) },
    ],
    [
      { heading: "The refi wave", body: "Roughly a third of the 2021 vintage is callable this year. Managers with cleaner docs are refinancing first; the discount margin pickup averages 40 basis points on the AAA." },
    ],
  ),
  report(
    "universe-density-39-countries",
    "The Universe in 39 Countries",
    "Coverage density, verification tiers and register-linkage across the 30,500-entity universe. Where the map is deep, and where it is building.",
    "cross-asset",
    ["Coverage", "Methodology"],
    24,
    "2026-06-18",
    "special",
    [
      { title: "Entities by verification tier", unit: "count", series: [{ label: "Verified", value: 8200 }, { label: "Register", value: 14100 }, { label: "Monitored", value: 8200 }] },
      { title: "Top jurisdictions by entity count", unit: "count", series: [{ label: "PL", value: 4100 }, { label: "DE", value: 3800 }, { label: "IT", value: 2900 }, { label: "ES", value: 2400 }, { label: "RO", value: 2100 }, { label: "GR", value: 1800 }] },
    ],
    [
      { heading: "Deep where it counts", body: "Coverage is deepest in Central and South-Eastern Europe by design: register adapters run against sixteen national sources, and the review gate has cleared 84% of proposed classifications in the region." },
    ],
    "report-universe",
  ),
  report(
    "direct-lending-terms-index-q2-2026",
    "Direct Lending Terms Index — Q2 2026",
    "Spreads, leverage, covenants and documentation flex across 120 tracked European unitranche transactions.",
    "private-credit",
    ["Direct lending", "Terms"],
    32,
    "2026-07-02",
    "quarterly",
    [
      { title: "Average unitranche spread", unit: "bps", series: QUARTER_LABELS.map((label, i) => ({ label, value: [625, 640, 610, 595, 580, 570, 560, 555][i]! })) },
      { title: "Covenant-lite share of new deals", unit: "%", series: QUARTER_LABELS.map((label, i) => ({ label, value: [18, 22, 25, 29, 31, 34, 33, 36][i]! })) },
    ],
    [
      { heading: "Spread compression, doc repair", body: "Spreads ground 25 basis points tighter over the year, but documentation moved the other way: EBITDA definitions shortened and two-thirds of new deals carry at least one maintenance covenant — the 2021 vintage's lesson, priced in." },
    ],
  ),
  report(
    "cat-bond-market-mid-year-2026",
    "European Cat Bond & ILS Mid-Year Review",
    "Issuance, spreads and peril mix as Mediterranean perils enter the market. The Aegean windstorm first.",
    "climate",
    ["ILS", "Cat bonds"],
    26,
    "2026-07-05",
    "quarterly",
    [
      { title: "European ILS issuance", unit: "€bn", series: QUARTER_LABELS.map((label, i) => ({ label, value: [0.6, 0.9, 1.1, 1.5, 1.2, 1.8, 2.1, 2.6][i]! })) },
      { title: "Peril mix H1 2026", unit: "%", series: [{ label: "Windstorm", value: 44 }, { label: "Flood", value: 27 }, { label: "Quake", value: 18 }, { label: "Wildfire", value: 11 }] },
    ],
    [
      { heading: "New perils, new sponsors", body: "The first Greek windstorm bond and a Serbian flood-resilience note broadened the market's peril map. Parametric triggers took a majority of new issuance for the first time." },
    ],
  ),
  report(
    "hedge-fund-flows-europe-h1-2026",
    "European Hedge Fund Flows — H1 2026",
    "Allocations, capacity and dispersion across the liquid alternatives book. Quant capacity is the binding constraint.",
    "hedge-funds",
    ["Hedge funds", "Flows"],
    22,
    "2026-06-24",
    "quarterly",
    [
      { title: "Net flows by strategy", unit: "€bn", series: [{ label: "Quant", value: 6.2 }, { label: "Macro", value: 4.1 }, { label: "L/S Eq", value: 1.8 }, { label: "Event", value: 1.2 }, { label: "Credit", value: 0.9 }, { label: "CTA", value: -0.6 }] },
    ],
    [
      { heading: "Capacity as alpha", body: "The strongest managers are turning capital away: three of the five largest European quant shops soft-closed in the half. Allocators responded by moving down the size curve — mid-sized systematic managers took record inflows." },
    ],
  ),
  report(
    "esoteric-annual-2026",
    "Esoteric Assets Annual — 2026",
    "Litigation finance, royalties, leasing and life settlements: the specialty sleeve grows up.",
    "esoteric",
    ["Esoteric", "Specialty finance"],
    40,
    "2026-06-12",
    "special",
    [
      { title: "European esoteric AUM by strategy", unit: "€bn", series: [{ label: "Leasing", value: 14.2 }, { label: "Litigation", value: 6.8 }, { label: "Royalties", value: 5.4 }, { label: "Life", value: 2.1 }] },
    ],
    [
      { heading: "Pension money arrives", body: "Litigation finance closed its first mainstream pension commitments in Europe. Duration is the caveat: court backlogs have stretched resolution profiles, and realised IRRs increasingly depend on settlement dynamics." },
    ],
  ),
  report(
    "collectibles-institutional-wrappers-2026",
    "Collectibles & Passion Assets — The Institutional Wrappers",
    "Fund structures, lending desks and valuation regimes across art, wine and hard collectibles.",
    "collectibles",
    ["Collectibles", "Structures"],
    20,
    "2026-05-30",
    "special",
    [
      { title: "Wrapped AUM by segment", unit: "€m", series: [{ label: "Art", value: 620 }, { label: "Wine & spirits", value: 340 }, { label: "Autos", value: 280 }, { label: "Horology", value: 190 }] },
    ],
    [
      { heading: "The lending desk era", body: "Collateralised art lending doubled in twelve months, led by Paris. Loan-to-value discipline held: median advance rates stayed under 50% despite the competition." },
    ],
  ),
  report(
    "tokenized-rwa-audit-2026",
    "Tokenized RWA — The First Audited Cycle",
    "What a full on-chain credit cohort proved, and the default question it left open.",
    "digital",
    ["Tokenization", "RWA"],
    16,
    "2026-06-21",
    "special",
    [
      { title: "European tokenized issuance", unit: "€m", series: QUARTER_LABELS.map((label, i) => ({ label, value: [40, 65, 90, 130, 180, 240, 310, 420][i]! })) },
    ],
    [
      { heading: "Proven and unproven", body: "A 14-position cohort completed issuance-to-repayment on-chain with zero reconciliation breaks. Untested: enforcement. No position defaulted, so the legal interface between on-chain claims and off-chain insolvency remains theoretical." },
    ],
  ),
  report(
    "infrastructure-baltics-corridor-2026",
    "The Baltic Corridor — Infrastructure Deep Dive",
    "Rail, grid and port assets along Europe's new logistics spine, and the capital forming around them.",
    "real-assets",
    ["Infrastructure", "Baltics"],
    30,
    "2026-06-06",
    "special",
    [
      { title: "Corridor capex pipeline", unit: "€bn", series: [{ label: "Rail", value: 8.4 }, { label: "Grid", value: 5.2 }, { label: "Ports", value: 3.1 }, { label: "Digital", value: 2.4 }] },
    ],
    [
      { heading: "A spine, not a spur", body: "The corridor's project pipeline now exceeds the combined national infrastructure budgets of the three Baltic states. Private capital's entry point is the operating-asset recycling programmes launching this year." },
    ],
    "report-baltic",
  ),
  report(
    "servicer-capacity-map-2026",
    "European Servicer Capacity Map",
    "Headcount, mandates and jurisdiction depth across 60 tracked servicing platforms.",
    "private-credit",
    ["Servicing", "NPL"],
    26,
    "2026-05-22",
    "league-table",
    [
      { title: "Assets under servicing, top platforms", unit: "€bn", series: [{ label: "Meridian", value: 12.4 }, { label: "Hellas AR", value: 8.6 }, { label: "Drina", value: 0.95 }] },
    ],
    [
      { heading: "Capacity follows the paper", body: "Servicing headcount is migrating west with the deal flow. Iberian hiring rose 22% in six months; Athens capacity contracted for the third straight quarter." },
    ],
  ),
  report(
    "watchdog-brief-june-2026",
    "Regulatory Watchdog Brief — June 2026",
    "AIFMD reporting reform lands; two NPL directives transpose; ILS authorisations accelerate.",
    "cross-asset",
    ["Regulation", "Watchdog"],
    16,
    "2026-06-16",
    "watchdog-brief",
    [
      { title: "Transposition progress, NPL directive", unit: "of 27", series: [{ label: "Complete", value: 21 }, { label: "Partial", value: 4 }, { label: "Pending", value: 2 }] },
    ],
    [
      { heading: "The month in supervision", body: "AIFMD II reporting templates were finalised, with first filings due Q1 2027. Two member states completed NPL directive transposition, leaving two pending against the deadline." },
    ],
  ),
];

export const MOCK_REPORT_BY_SLUG: ReadonlyMap<string, MockReport> = new Map(
  MOCK_REPORTS.map((r) => [r.slug, r]),
);

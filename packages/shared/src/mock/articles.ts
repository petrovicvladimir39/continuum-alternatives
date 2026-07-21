import { mulberry32 } from "../npl-sim";
import { MOCK_ENTITIES, MOCK_ENTITY_BY_SLUG, type MockEntity } from "./entities";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. ~30 full news articles for
 * /v2/news/[slug] tear sheets: headline, deck, multi-paragraph body,
 * byline, citations, related entities, hero image seed. Six flagship
 * pieces are handcrafted; the rest assemble deterministically from
 * class-voiced paragraph templates. All names fictional.
 */

export type MockCitation = {
  source: string;
  url: string | null;
  /** Verbatim quote rendered in the citation rail. */
  quote: string;
};

export type MockArticle = {
  id: string;
  slug: string;
  headline: string;
  deck: string;
  publishedOn: string;
  assetClass: MockEntity["assetClass"];
  strategySlug: string | null;
  byline: string;
  readMinutes: number;
  imageSeed: string;
  body: string[];
  citations: MockCitation[];
  relatedEntitySlugs: string[];
};

const BYLINES = [
  "Katalin Varga",
  "Miguel Serra",
  "Astrid Holm",
  "Bogdan Iliescu",
  "Chiara Bellini",
  "Nils Vinter",
];

type Seed = {
  slug: string;
  headline: string;
  deck: string;
  publishedOn: string;
  assetClass: MockEntity["assetClass"];
  strategySlug: string | null;
  entitySlugs: string[];
  /** Handcrafted body; when absent the template composer fills it. */
  body?: string[];
};

const FLAGSHIPS: Seed[] = [
  {
    slug: "polish-buyout-fundraising-tops-cycle",
    headline: "Polish buyout fundraising tops the cycle as Vistula closes Fund IX",
    deck: "Three CEE managers now hold dry powder above €1bn each — a first for the region.",
    publishedOn: "2026-07-18",
    assetClass: "private-equity",
    strategySlug: "lbo",
    entitySlugs: ["vistula-growth-partners", "vistula-growth-fund-ix", "nordwind-pension-alliance"],
    body: [
      "Vistula Growth Partners has held the final close of its ninth buyout fund at €850m, above an original €700m target and inside six months of formal launch. The close makes Vistula the third Central European manager this cycle to hold more than €1bn in undeployed capital, after a decade in which no CEE buyout franchise had crossed that line.",
      "The fundraise was anchored by Nordwind Pension Alliance, which re-upped at double its Fund VIII commitment, and drew first-time allocations from two Nordic institutions. People close to the process say the book was covered by March and that the manager turned away roughly €200m to hold the hard cap.",
      "The close lands against a European mid-market that has become quietly competitive: entry multiples in Poland and Romania have compressed less than in the DACH region, and local banks have returned to underwriting six-times leverage for platform deals. Vistula's last three exits — including the dual-track sale of Silesia Logistics Group — returned a blended 2.8x gross, according to a person with direct knowledge of the numbers.",
      "Fund IX will keep the franchise's sector spine — industrial services, specialty distribution, and healthcare adjacencies — with ticket sizes of €40m to €120m. The manager has signalled it will do more corporate carve-outs, an area where regional supply has thickened as Western European groups rationalise their CEE footprints.",
      "For LPs, the close is a data point in a larger repricing of the region. Central European buyout vintages 2016-2021 are now outperforming their Western peers in most databases, and allocators who once bracketed the region as frontier risk are re-cutting their Europe sleeves accordingly.",
    ],
  },
  {
    slug: "npl-market-shifts-south",
    headline: "Europe's NPL market shifts south as Iberian sellers return",
    deck: "Douro Savings Bank's CRE-backed sale is the third Iberian portfolio this quarter.",
    publishedOn: "2026-07-15",
    assetClass: "private-credit",
    strategySlug: "npl",
    entitySlugs: ["douro-savings-bank", "aegean-yield-partners", "meridian-loan-servicing"],
    body: [
      "The centre of gravity in Europe's non-performing loan market is moving south again. Douro Savings Bank has launched the sale of a €210m commercial-real-estate-backed book — Project Douro — making it the third Iberian portfolio to reach the market this quarter after two years in which CEE jurisdictions dominated deal flow.",
      "The sale is being run as a competitive process with a September bid deadline. Buy-side interest is expected from the credit funds that have been building Iberian servicing capacity since 2024, with Meridian Loan Servicing seen as the natural servicing partner for whichever fund prevails.",
      "The southern shift has a simple macro driver: Iberian banks cleaned their books early in the last cycle and are now selling granular re-defaults at thin discounts, while Greek and Cypriot sellers have largely completed their deleveraging programmes. Aegean Yield Partners, the Athens-based buyer that dominated Hellenic auctions in 2024-25, has been explicit that its next capital will deploy west of the Adriatic.",
      "Pricing tension is real. Secured corporate books in Portugal cleared in the low-forties cents last quarter, several points inside where equivalent CEE risk trades, reflecting both collateral quality and the maturity of the enforcement infrastructure.",
      "For the servicing industry, the shift is a reallocation problem: capacity built for Greek retail books does not transfer cleanly to Portuguese CRE. Expect hiring in Lisbon and Porto — and margin pressure in Athens.",
    ],
  },
  {
    slug: "energy-transition-vehicles-double",
    headline: "Energy-transition vehicles double their European commitments",
    deck: "Helvetia's second fund close signals institutional appetite beyond the Nordics.",
    publishedOn: "2026-07-10",
    assetClass: "climate",
    strategySlug: "carbon_markets",
    entitySlugs: ["helvetia-renewables-management", "helvetia-energy-transition-fund-ii", "fjord-green-capital"],
    body: [
      "European energy-transition funds have committed twice as much capital in the first half of 2026 as in the same period last year, and the buyer base is broadening beyond the Nordic institutions that seeded the strategy.",
      "Helvetia Renewables Management's second energy-transition fund held its final close at €600m this week, with insurance capital taking nearly half the book. The Zurich manager's first fund, a 2023 vintage, is fully deployed across carbon-offtake structures and transition infrastructure.",
      "The growth is not confined to the megafunds. Fjord Green Capital in Oslo has quietly assembled a €680m platform spanning voluntary carbon markets and PPA-backed lending, and mid-sized vehicles are appearing in Paris and Amsterdam.",
      "The open question is standards. Carbon-credit quality regimes remain fragmented across jurisdictions, and managers concede privately that institutional capital is moving faster than the verification infrastructure beneath it.",
      "What is not in question is the direction: transition capital has stopped being a satellite allocation. For a growing set of European LPs it now sits inside the core alternatives budget — reviewed by the same committees, benchmarked against the same hurdle rates.",
    ],
  },
  {
    slug: "clo-machine-restarts-luxembourg",
    headline: "The CLO machine restarts in Luxembourg",
    deck: "Moselle prices its twelfth deal as European issuance clears the post-2022 backlog.",
    publishedOn: "2026-07-06",
    assetClass: "structured",
    strategySlug: "clo",
    entitySlugs: ["moselle-clo-management", "moselle-clo-xii", "baltic-financial-supervision-authority"],
    body: [
      "European CLO issuance has found its rhythm again. Moselle CLO Management priced its twelfth vehicle this week — a €400m deal with the AAA tranche landing inside initial guidance — and the Luxembourg arranger community is describing the deepest investor book since 2021.",
      "The demand story is bank treasuries returning to the senior stack, joined by Asian accounts that sat out the rate-shock years. Mezzanine remains thinner, but the equity arbitrage works again at current loan spreads, which is what restarts the machine.",
      "Supply is following. Warehouses that idled through 2023-24 are being termed out, and two debut managers are in the market with first deals. The refinancing wave matters as much as new issuance: roughly a third of the 2021 vintage is now callable.",
      "Regulators are watching the restart with a sharper eye than last cycle. Risk-retention verification has moved from annual attestation to transaction-level review in several jurisdictions, and supervisors have signalled that manager-affiliate retention structures will get particular attention.",
      "The result is a market that looks structurally healthier than its pre-2022 self: wider equity, cleaner docs, and a supervisory perimeter that has already priced in the lessons of the last drawdown.",
    ],
  },
  {
    slug: "litigation-finance-goes-institutional",
    headline: "Litigation finance completes its institutional turn",
    deck: "Justitia's third claims fund closes with pension money — and a duration warning.",
    publishedOn: "2026-06-28",
    assetClass: "esoteric",
    strategySlug: "litigation_finance",
    entitySlugs: ["justitia-litigation-capital", "justitia-claims-fund-iii"],
    body: [
      "Litigation finance has crossed a line it has chased for a decade: mainstream pension capital. Justitia Litigation Capital closed its third claims fund at €210m this month with two European retirement systems in the book — the strategy's clearest institutional endorsement to date.",
      "The Amsterdam manager's pitch is duration-matched, uncorrelated return: a diversified book of commercial claims with expected resolution profiles of three to seven years, underwritten case by case with external counsel.",
      "The warning inside the endorsement is duration itself. Court backlogs across several European jurisdictions have stretched resolution timelines, and the industry's realised IRRs increasingly depend on settlement dynamics rather than judgment outcomes.",
      "Regulatory scrutiny is arriving alongside the capital. Disclosure obligations for funded claims are under consultation in three member states, and the direction of travel is toward transparency about funding arrangements in commercial proceedings.",
      "For allocators, the asset class is settling into its natural size: a niche sleeve inside esoteric alternatives — genuinely uncorrelated, capacity-constrained, and unforgiving of underwriting error.",
    ],
  },
  {
    slug: "tokenized-credit-first-audited-cycle",
    headline: "Tokenized private credit completes its first audited cycle",
    deck: "Tallinn Token Capital's RWA fund reports a full loan cohort from issuance to repayment on-chain.",
    publishedOn: "2026-06-20",
    assetClass: "digital",
    strategySlug: "tokenized_rwa",
    entitySlugs: ["tallinn-token-capital", "tallinn-rwa-fund-i", "amber-chain-custody"],
    body: [
      "The tokenized real-world-asset experiment has produced its first complete, audited credit cycle in Europe. Tallinn Token Capital's RWA Fund I has reported a full cohort of tokenized private-credit positions carried from issuance through repayment, with the servicing waterfall executed on-chain and reconciled by an external auditor.",
      "The cohort is small — €110m across 14 positions — but the mechanics matter more than the size. Interest and principal flows were distributed programmatically to token holders, and the audit found no reconciliation breaks between the on-chain record and the underlying loan agreements.",
      "Custody remains the institutional gating item. Amber Chain Custody, which held the cohort's instruments, received its MiCA authorisation in March; two more European custodians are in the queue.",
      "Skeptics note what the cycle did not test: default. No position in the cohort required enforcement, so the legal question — how an on-chain claim performs in an off-chain insolvency — remains open.",
      "Even so, the direction is set. Tokenization has moved from white paper to audited track record, and the next fundraise will be judged on credit terms, not technology.",
    ],
  },
];

// ── Template composer for the remaining articles ───────────────────────────

const OPENERS: Record<string, (a: MockEntity, b: MockEntity, amt: string) => string> = {
  "private-equity": (a, b, amt) =>
    `${a.name} has agreed to acquire a controlling stake in ${b.name}, valuing the business at ${amt}. The deal extends a run of platform activity in the ${a.city} manager's core sectors and is expected to close before year-end, subject to clearance.`,
  "private-credit": (a, b, amt) =>
    `${a.name} has priced a ${amt} transaction with ${b.name}, in the latest sign that Europe's private-credit engine room is running above trend. Terms were not disclosed, but people familiar with the process describe pricing inside the last comparable trade.`,
  "real-assets": (a, b, amt) =>
    `${a.name} has committed ${amt} to a new real-assets programme alongside ${b.name}, targeting income-producing assets across its home region. The mandate reflects a broader rotation of institutional capital toward tangible cash flows.`,
  "hedge-funds": (a, b, amt) =>
    `${a.name} has reopened capacity in its flagship strategy after a strong first half, with inflows led by ${b.name}. The ${a.city} manager had been closed to new capital since 2024; the reopening is capped at ${amt}.`,
  structured: (a, b, amt) =>
    `${a.name} has priced a ${amt} securitisation, with the senior tranche landing inside guidance and the book multiple times covered. ${b.name} is understood to have anchored the mezzanine.`,
  esoteric: (a, b, amt) =>
    `${a.name} has closed a ${amt} specialty-finance transaction with ${b.name}, adding to a quarter in which esoteric strategies have quietly outraised several mainstream sleeves.`,
  collectibles: (a, b, amt) =>
    `${a.name} has completed a ${amt} portfolio transaction in the passion-asset market, with ${b.name} providing acquisition finance. The trade illustrates how institutional wrappers keep spreading into collectibles.`,
  climate: (a, b, amt) =>
    `${a.name} has issued a ${amt} climate-linked instrument, with demand led by ${b.name}. The transaction is the latest in a first half that has doubled European transition issuance year on year.`,
  digital: (a, b, amt) =>
    `${a.name} has completed a ${amt} digital-asset transaction with ${b.name}, another step in the asset class's migration from venture experiment to regulated infrastructure.`,
};

const MIDDLES: string[] = [
  "The process drew a broader buyer group than the last comparable transaction, according to two people with knowledge of the book. Advisers describe allocation decisions as unusually difficult, with several accounts scaled back materially.",
  "Market participants point to the structure as the notable feature: a two-tranche design that lets institutional buyers take the senior exposure while the sponsor retains alignment through a first-loss position.",
  "The transaction had been in preparation since the first quarter, and its completion was read by several market participants as a signal that the pipeline behind it — at least three comparable situations — will now accelerate.",
  "Pricing details were closely held, but comparable trades this quarter suggest a level several points inside where the risk would have cleared a year ago, a repricing driven as much by scarcity of supply as by rate expectations.",
  "People close to the parties emphasise the regional dimension: activity of this kind was concentrated in Western Europe until recently, and its arrival further east marks a maturing of local capital markets infrastructure.",
  "The counterparties worked with local counsel in two jurisdictions, and the documentation is expected to become a reference for similar transactions — several market participants have already requested redacted precedents.",
];

const CLOSERS: string[] = [
  "The record will be updated as filings land; the entities involved carry full provenance trails on their Continuum profiles.",
  "Whether the trade marks a turn in the cycle or a one-off remains the open question — the next two quarters of filings will answer it.",
  "For the wider market, the message is straightforward: capital is available, terms are tightening, and the institutions that built infrastructure early are collecting the premium.",
  "Advisers involved declined to comment beyond confirming completion. Further detail is expected in the next regulatory filing cycle.",
];

const AMTS = ["€120m", "€150m", "€210m", "€275m", "€340m", "€420m", "€500m", "€650m", "€800m"];

const GENERATED_SEEDS: Omit<Seed, "body">[] = [
  { slug: "hanseatic-carveout-wave", headline: "Hanseatic rides the German carve-out wave", deck: "Corporate disposals are feeding the mid-market pipeline.", publishedOn: "2026-07-16", assetClass: "private-equity", strategySlug: "lbo", entitySlugs: ["hanseatic-capital-management", "alpenmilch-dairy-holding"] },
  { slug: "secondaries-repricing-quietly", headline: "Secondaries reprice, quietly", deck: "Sprea's Fund II deploys into a narrowing discount window.", publishedOn: "2026-07-12", assetClass: "private-equity", strategySlug: "secondaries", entitySlugs: ["sprea-secondaries-group", "sprea-secondaries-fund-ii"] },
  { slug: "venture-milan-rebuilds", headline: "Milan's venture scene rebuilds around Navigli", deck: "Fund IV anchors a new generation of Italian early-stage capital.", publishedOn: "2026-07-04", assetClass: "private-equity", strategySlug: "venture_capital", entitySlugs: ["navigli-ventures", "navigli-ventures-fund-iv"] },
  { slug: "growth-equity-atlantic-arc", headline: "Growth equity finds the Atlantic arc", deck: "Lisbon and Dublin managers report competing term sheets.", publishedOn: "2026-06-25", assetClass: "private-equity", strategySlug: "growth_equity", entitySlugs: ["atlas-lisboa-partners", "liffey-growth-equity"] },
  { slug: "direct-lending-covenant-repair", headline: "Direct lending's covenant repair job", deck: "Danube's new fund writes docs the 2021 vintage wishes it had.", publishedOn: "2026-07-14", assetClass: "private-credit", strategySlug: "direct_lending", entitySlugs: ["danube-credit-partners", "danube-direct-lending-fund-iii"] },
  { slug: "balkan-npl-pipeline-opens", headline: "The Balkan NPL pipeline opens", deck: "Sofia and Belgrade sellers prepare first competitive processes.", publishedOn: "2026-07-08", assetClass: "private-credit", strategySlug: "npl", entitySlugs: ["balkan-united-bank", "sava-capital-group"] },
  { slug: "venture-debt-fills-series-b-gap", headline: "Venture debt fills the Series B gap", deck: "Griffin's book doubles as equity rounds stay scarce.", publishedOn: "2026-06-30", assetClass: "private-credit", strategySlug: "venture_debt", entitySlugs: ["griffin-venture-debt", "kalevala-gaming-studios"] },
  { slug: "re-debt-refinancing-wall", headline: "Real estate debt meets the refinancing wall", deck: "Meuse raises as €40bn of European CRE loans mature.", publishedOn: "2026-06-22", assetClass: "private-credit", strategySlug: "re_debt", entitySlugs: ["meuse-real-estate-credit", "vindobona-real-estate-partners"] },
  { slug: "infrastructure-baltic-corridor", headline: "The Baltic corridor gets its infrastructure fund", deck: "Vilnius-based Baltic Bridge closes Fund I on rail and grid assets.", publishedOn: "2026-07-11", assetClass: "real-assets", strategySlug: "infrastructure_economic", entitySlugs: ["baltic-bridge-infrastructure", "baltic-bridge-infra-fund-i"] },
  { slug: "farmland-quiet-bid", headline: "The quiet bid for Polish farmland", deck: "Sarmatia's holdings model institutional agriculture for the region.", publishedOn: "2026-07-02", assetClass: "real-assets", strategySlug: "natural_resources", entitySlugs: ["sarmatia-farmland-holdings", "piast-national-development-fund"] },
  { slug: "social-infra-hamburg-model", headline: "Hamburg's social-infrastructure model travels", deck: "Nordlicht exports its schools-and-clinics playbook.", publishedOn: "2026-06-18", assetClass: "real-assets", strategySlug: "infrastructure_social", entitySlugs: ["nordlicht-social-infra", "polaris-sovereign-partners"] },
  { slug: "adriatic-hospitality-reprices", headline: "Adriatic hospitality assets reprice", deck: "Dalmatia's value-add book marks the coast's institutional turn.", publishedOn: "2026-06-14", assetClass: "real-assets", strategySlug: "re_value_add_opportunistic", entitySlugs: ["dalmatia-hospitality-assets", "adriatic-shipyards-group"] },
  { slug: "quant-copenhagen-capacity", headline: "Copenhagen's quant capacity problem", deck: "Øresund soft-closes as systematic demand outruns supply.", publishedOn: "2026-07-13", assetClass: "hedge-funds", strategySlug: "quant", entitySlugs: ["oresund-quant-capital", "oresund-systematic-fund"] },
  { slug: "macro-geneva-rates-regime", headline: "Geneva macro and the new rates regime", deck: "Helvetia Macro's H1 numbers vindicate the volatility book.", publishedOn: "2026-07-05", assetClass: "hedge-funds", strategySlug: "global_macro", entitySlugs: ["helvetia-macro-advisors", "aegis-hellenic-endowment"] },
  { slug: "merger-arb-regulatory-alpha", headline: "Merger arb's regulatory alpha", deck: "Thames Event Partners profits from deal-approval dispersion.", publishedOn: "2026-06-26", assetClass: "hedge-funds", strategySlug: "merger_arbitrage", entitySlugs: ["thames-event-partners", "amstel-corporate-finance"] },
  { slug: "abs-auto-paper-returns", headline: "European auto paper returns to favour", deck: "Danubius 2026-1 prices through guidance on heavy demand.", publishedOn: "2026-07-09", assetClass: "structured", strategySlug: "abs", entitySlugs: ["aegir-structured-finance", "danubius-auto-abs-2026-1"] },
  { slug: "rmbs-italian-comeback", headline: "Italian RMBS stages a comeback", deck: "Tiber's latest deal reopens a market dormant since 2022.", publishedOn: "2026-06-24", assetClass: "structured", strategySlug: "rmbs", entitySlugs: ["tiber-securitisation-partners", "ambra-banca-popolare"] },
  { slug: "aircraft-leasing-malta-hub", headline: "Malta consolidates as Europe's leasing hub", deck: "Adriatic Wings adds six narrowbodies in a sale-and-leaseback.", publishedOn: "2026-07-07", assetClass: "esoteric", strategySlug: "transport_leasing", entitySlugs: ["adriatic-wings-leasing", "poseidon-shipping-finance"] },
  { slug: "royalties-pharma-slovenia", headline: "Pharma royalties find a Slovenian specialist", deck: "Karst's niche book draws first institutional commitments.", publishedOn: "2026-06-16", assetClass: "esoteric", strategySlug: "ip_royalties", entitySlugs: ["karst-pharma-royalties", "aria-royalty-partners"] },
  { slug: "art-lending-paris-desk", headline: "Paris builds an art-lending desk", deck: "Louvre Rive's collateralised book doubles in twelve months.", publishedOn: "2026-07-03", assetClass: "collectibles", strategySlug: "fine_art", entitySlugs: ["louvre-rive-art-lending", "uffizi-art-capital"] },
  { slug: "whisky-casks-regulated-wrapper", headline: "Whisky casks get a regulated wrapper", deck: "Alba's members structure is the template supervisors asked for.", publishedOn: "2026-06-12", assetClass: "collectibles", strategySlug: "wine_spirits", entitySlugs: ["alba-whisky-cask-partners", "tokaj-fine-wine-reserve"] },
  { slug: "cat-bonds-aegean-peril", headline: "Cat bonds price Aegean peril", deck: "Aeolus brings the first Greek windstorm bond to market.", publishedOn: "2026-07-01", assetClass: "climate", strategySlug: "ils_cat_bonds", entitySlugs: ["aeolus-cat-bond-partners", "aeolus-windstorm-bond-2026"] },
  { slug: "ils-dutch-discipline", headline: "The Dutch discipline in ILS", deck: "Polder Re's underwriting note becomes required reading.", publishedOn: "2026-06-19", assetClass: "climate", strategySlug: "ils_cat_bonds", entitySlugs: ["polder-re-ils-management", "nordic-insurance-supervisor"] },
  { slug: "carbon-offtake-standardises", headline: "Carbon offtakes standardise", deck: "Mistral's exchange contracts anchor the voluntary market's plumbing.", publishedOn: "2026-06-10", assetClass: "climate", strategySlug: "carbon_markets", entitySlugs: ["mistral-carbon-exchange", "fjord-green-capital"] },
  { slug: "compute-nordic-buildout", headline: "The Nordic compute build-out compounds", deck: "Fjell's GPU capacity is pre-sold through 2027.", publishedOn: "2026-07-17", assetClass: "digital", strategySlug: "compute_infrastructure", entitySlugs: ["fjell-compute-partners", "vardar-datacenter-holdings"] },
  { slug: "custody-mica-queue", headline: "The MiCA custody queue clears", deck: "Amber Chain's authorisation opens institutional rails in the Baltics.", publishedOn: "2026-06-15", assetClass: "digital", strategySlug: "crypto", entitySlugs: ["amber-chain-custody", "bohemia-digital-ventures"] },
  { slug: "lp-reups-concentrate", headline: "LP re-ups concentrate into fewer hands", deck: "Nordwind and Confluence data show the flight to franchise.", publishedOn: "2026-06-08", assetClass: "private-equity", strategySlug: null, entitySlugs: ["nordwind-pension-alliance", "confluence-insurance-group"] },
  { slug: "servicing-capacity-reallocates", headline: "NPL servicing capacity reallocates west", deck: "Meridian hires in Porto as Hellas Asset Resolution consolidates.", publishedOn: "2026-06-05", assetClass: "private-credit", strategySlug: "npl", entitySlugs: ["meridian-loan-servicing", "hellas-asset-resolution"] },
];

function composeBody(seed: Omit<Seed, "body">, rand: () => number): string[] {
  const a = MOCK_ENTITY_BY_SLUG.get(seed.entitySlugs[0]!) ?? MOCK_ENTITIES[0]!;
  const b = MOCK_ENTITY_BY_SLUG.get(seed.entitySlugs[1] ?? "") ?? MOCK_ENTITIES[1]!;
  const amt = AMTS[Math.floor(rand() * AMTS.length)]!;
  const opener = OPENERS[seed.assetClass]!(a, b, amt);
  const middleCount = 2 + Math.floor(rand() * 2);
  const middles: string[] = [];
  const used = new Set<number>();
  while (middles.length < middleCount) {
    const i = Math.floor(rand() * MIDDLES.length);
    if (!used.has(i)) {
      used.add(i);
      middles.push(MIDDLES[i]!);
    }
  }
  return [opener, ...middles, CLOSERS[Math.floor(rand() * CLOSERS.length)]!];
}

function citationsFor(seed: Omit<Seed, "body">, rand: () => number): MockCitation[] {
  const pool: MockCitation[] = [
    { source: "Regulatory filing", url: null, quote: "The transaction completed in accordance with the terms announced." },
    { source: "Company statement", url: "https://example.invalid/statement", quote: "We are pleased to confirm the closing of the transaction." },
    { source: "Court gazette", url: null, quote: "The registration was entered into the public record." },
    { source: "Industry press", url: "https://example.invalid/article", quote: "People familiar with the process described demand as robust." },
    { source: "Register extract", url: null, quote: "Beneficial ownership recorded as of the filing date." },
  ];
  const n = 2 + Math.floor(rand() * 2);
  const out: MockCitation[] = [];
  const used = new Set<number>();
  while (out.length < n) {
    const i = Math.floor(rand() * pool.length);
    if (!used.has(i)) {
      used.add(i);
      out.push(pool[i]!);
    }
  }
  return out;
}

const rand = mulberry32(4242);

const ALL_SEEDS: Seed[] = [...FLAGSHIPS, ...GENERATED_SEEDS];

export const MOCK_ARTICLES: MockArticle[] = ALL_SEEDS.map((seed, i) => {
  const body = seed.body ?? composeBody(seed, rand);
  return {
    id: `mock-a-${i + 1}`,
    slug: seed.slug,
    headline: seed.headline,
    deck: seed.deck,
    publishedOn: seed.publishedOn,
    assetClass: seed.assetClass,
    strategySlug: seed.strategySlug,
    byline: BYLINES[i % BYLINES.length]!,
    readMinutes: 3 + (i % 4),
    imageSeed: `article-${seed.slug}`,
    body,
    citations: citationsFor(seed, rand),
    relatedEntitySlugs: seed.entitySlugs,
  };
});

export const MOCK_ARTICLE_BY_SLUG: ReadonlyMap<string, MockArticle> = new Map(
  MOCK_ARTICLES.map((a) => [a.slug, a]),
);

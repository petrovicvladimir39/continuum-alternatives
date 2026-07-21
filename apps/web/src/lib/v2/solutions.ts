/**
 * P6 — six persona pages. Claims are drawn from REAL platform capabilities
 * only (register-linked corpus, review gate, watchlists + alerts, API/MCP,
 * auction tracking, events + meeting prep, NPL simulator, entity claiming).
 * No promised feature appears here unless it exists in production or is
 * explicitly labeled preview elsewhere.
 */

export type Solution = {
  slug: string;
  persona: string;
  title: string;
  lede: string;
  claims: { head: string; body: string }[];
  reportSlug: string;
  reportLabel: string;
};

export const V2_SOLUTIONS: Solution[] = [
  {
    slug: "raise-capital",
    persona: "For GPs raising",
    title: "Be found by the LPs already mapping your strategy",
    lede: "Allocators use the record to screen managers by strategy, geography and verified track signals. Your entity page is where that search ends — claim it and keep it accurate.",
    claims: [
      { head: "A verified entity record", body: "Register-linked identity (GLEIF and national registers), your fund shelf, and a cited timeline of closes and deals — the diligence pack that exists before you send one." },
      { head: "Claiming & stewardship", body: "Claim your entity, add a steward statement, and correct the record through the review gate — corrections are new facts, never silent edits." },
      { head: "Signal distribution", body: "Fund closes and mandates enter the class feeds and league tables the moment they clear review, with your source cited." },
    ],
    reportSlug: "cee-private-capital-annual-2026",
    reportLabel: "CEE Private Capital — Annual Review",
  },
  {
    slug: "deal-sourcing",
    persona: "For investors sourcing",
    title: "Surface signals before they become processes",
    lede: "Insolvency filings, covenant events, register changes and auction launches — recorded from 84 sources with the timestamp of when the record learned it.",
    claims: [
      { head: "Bitemporal feed", body: "Every fact carries occurred-at and recorded-at. Watch the delta: the record often knows before the market narrative does." },
      { head: "Watchlists + alerts", body: "Follow entities, strategies or geographies; alerts land in your digest when new facts clear review." },
      { head: "The auction tracker", body: "Live NPL and distressed processes with bid deadlines from process letters and gazettes." },
    ],
    reportSlug: "european-npl-monitor-q2-2026",
    reportLabel: "European NPL Monitor",
  },
  {
    slug: "portfolio-monitoring",
    persona: "For LPs & lenders",
    title: "Watch the record around your exposure",
    lede: "Your portfolio's counterparties file, restructure, hire and default in public sources across 39 countries. The record watches them so your team doesn't have to.",
    claims: [
      { head: "Entity timelines", body: "Approved, cited facts in date order for every portfolio company, GP and counterparty — append-only, so history never rewrites." },
      { head: "Relationship edges", body: "Who manages, advises, services and lends around each holding — the graph a workout call needs." },
      { head: "Alerts on covenant-adjacent events", body: "Insolvency openings, credit events and register changes on watched entities, delivered on approval." },
    ],
    reportSlug: "direct-lending-terms-index-q2-2026",
    reportLabel: "Direct Lending Terms Index",
  },
  {
    slug: "npl-servicing",
    persona: "For servicers",
    title: "Auctions, mandates and workout intelligence",
    lede: "The servicing market is reallocating across Europe. The record tracks the portfolios, the sellers, and the capacity moves — with sources.",
    claims: [
      { head: "Process tracking", body: "Live portfolio sales with GBV, collateral type and deadlines; auction updates as they clear review." },
      { head: "The NPL simulator", body: "Deterministic Monte Carlo over stated assumptions — same params + seed, same output. Price books with an auditable model." },
      { head: "Capacity mapping", body: "Servicer platforms, mandates and jurisdiction depth across the covered markets." },
    ],
    reportSlug: "servicer-capacity-map-2026",
    reportLabel: "European Servicer Capacity Map",
  },
  {
    slug: "investor-relations",
    persona: "For IR teams",
    title: "Own your entity record and its provenance",
    lede: "When allocators and journalists check the record, your page is what they find. Stewardship keeps it accurate; provenance keeps it credible.",
    claims: [
      { head: "Steward statements", body: "A claimed entity carries your statement beside the cited record — your voice, clearly separated from the facts." },
      { head: "Correction with audit trail", body: "Disputes route through the review gate; the timeline shows what changed and why, forever." },
      { head: "Events & meeting prep", body: "Industry event attendance and preparation briefs around your entity's counterparties." },
    ],
    reportSlug: "gp-league-tables-h1-2026",
    reportLabel: "European GP League Tables",
  },
  {
    slug: "vendor-diligence",
    persona: "For advisors & vendors",
    title: "Verified counterparty context in one place",
    lede: "Pitches, conflicts checks and mandate scoping start with the same question: who is this, really? The register-linked record answers it with citations.",
    claims: [
      { head: "Register-linked identity", body: "30,500 entities tied to national registers and GLEIF where available, with verification tiers stated." },
      { head: "API & MCP access", body: "The same record, machine-readable: REST v1 plus an MCP server for agentic workflows. Keys, limits and shapes documented." },
      { head: "Vendor tier", body: "A claimed vendor profile puts your mandates and coverage areas beside the entities you serve." },
    ],
    reportSlug: "universe-density-39-countries",
    reportLabel: "The Universe in 39 Countries",
  },
];

export function solutionBySlug(slug: string): Solution | null {
  return V2_SOLUTIONS.find((s) => s.slug === slug) ?? null;
}

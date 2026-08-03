import { V2_CLASSES } from "./taxonomy";

/**
 * FRONTEND-V2 navigation model — single source for the GlobalHeader, the
 * command palette, the footer and the Products/Solutions index pages.
 */

export type V2NavItem = {
  label: string;
  href: string;
  /** Short supporting line for dropdowns and palette rows. */
  hint?: string;
  /** Labeled prototype (no backend yet) — rendered with a PREVIEW tag. */
  preview?: boolean;
};

export const V2_MARKETS_NAV: V2NavItem[] = V2_CLASSES.map((c) => ({
  label: c.label,
  href: `/v2/markets/${c.slug}`,
  hint: c.desk,
}));

export const V2_PRODUCTS_NAV: V2NavItem[] = [
  {
    label: "Company Intelligence",
    href: "/v2/products/company-intelligence",
    hint: "Screen 30,500 entities — GLEIF-verified, class-filtered, saved queries.",
  },
  {
    label: "Transaction Engine",
    href: "/v2/products/transaction-engine",
    hint: "Deals, fund closes and NPL trades as structured, citable records.",
  },
  {
    label: "NPL Simulator",
    href: "/v2/products/npl-simulator",
    hint: "Deterministic portfolio cash-flow simulation for loan books.",
  },
  {
    label: "Term Intelligence",
    href: "/v2/products/term-intelligence",
    hint: "Fund terms and market standard clauses.",
    preview: true,
  },
  {
    label: "Benchmarks",
    href: "/v2/products/benchmarks",
    hint: "Vintage and strategy benchmarks.",
    preview: true,
  },
  {
    label: "ESG Intelligence",
    href: "/v2/products/sustainability-esg",
    hint: "Sustainability signals across the record.",
    preview: true,
  },
  {
    label: "Enterprise Data & MCP",
    href: "/v2/products/enterprise-data",
    hint: "REST API, exports and the MCP server for agentic access.",
  },
];

export const V2_SOLUTIONS_NAV: V2NavItem[] = [
  {
    label: "Raise Capital",
    href: "/v2/solutions/raise-capital",
    hint: "For GPs — be found by the LPs already mapping your strategy.",
  },
  {
    label: "Deal Sourcing",
    href: "/v2/solutions/deal-sourcing",
    hint: "For investors — surface signals before they become processes.",
  },
  {
    label: "Portfolio Monitoring",
    href: "/v2/solutions/portfolio-monitoring",
    hint: "For LPs and lenders — watch the record around your exposure.",
  },
  {
    label: "NPL Servicing",
    href: "/v2/solutions/npl-servicing",
    hint: "For servicers — auctions, mandates and workout intelligence.",
  },
  {
    label: "Investor Relations",
    href: "/v2/solutions/investor-relations",
    hint: "For IR teams — own your entity record and its provenance.",
  },
  {
    label: "Vendor Diligence",
    href: "/v2/solutions/vendor-diligence",
    hint: "For advisors — verified counterparty context in one place.",
  },
];

export const V2_NEWS_NAV: V2NavItem[] = [
  { label: "Latest", href: "/v2/news/latest", hint: "Everything, chronological." },
  { label: "Live Signals", href: "/v2/news/live-signals", hint: "Fresh regulatory + press signals." },
  { label: "Regulatory Watchdog", href: "/v2/news/regulatory-watchdog", hint: "Filings, gazettes, courts." },
  { label: "Auctions", href: "/v2/news/auctions", hint: "Live NPL and distressed processes." },
];

export const V2_TOP_NAV: {
  label: string;
  href: string;
  children?: V2NavItem[];
}[] = [
  { label: "News", href: "/v2/news" },
  { label: "Markets", href: "/v2/coverage", children: V2_MARKETS_NAV },
  { label: "Network & Threads", href: "/v2/network" },
  { label: "Universe", href: "/v2/universe" },
  { label: "Products", href: "/v2/products/company-intelligence", children: V2_PRODUCTS_NAV },
  { label: "Solutions", href: "/v2/solutions/raise-capital", children: V2_SOLUTIONS_NAV },
  { label: "Reports & Insights", href: "/v2/reports" },
  { label: "About", href: "/v2/about" },
];

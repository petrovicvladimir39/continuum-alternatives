/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. Sample articles, auctions and
 * events for surfaces beyond the feed. Small, handcrafted, deterministic.
 */

export type MockArticle = {
  id: string;
  slug: string;
  headline: string;
  deck: string;
  publishedOn: string;
  assetClass: string;
};

export const MOCK_ARTICLES: MockArticle[] = [
  {
    id: "mock-a-1",
    slug: "polish-buyout-fundraising-tops-cycle",
    headline: "Polish buyout fundraising tops the cycle as Vistula closes Fund IX",
    deck: "Three CEE managers now hold dry powder above €1bn each — a first for the region.",
    publishedOn: "2026-07-18",
    assetClass: "private-equity",
  },
  {
    id: "mock-a-2",
    slug: "npl-market-shifts-south",
    headline: "Europe's NPL market shifts south as Iberian sellers return",
    deck: "Douro Savings Bank's CRE-backed sale is the third Iberian portfolio this quarter.",
    publishedOn: "2026-07-15",
    assetClass: "private-credit",
  },
  {
    id: "mock-a-3",
    slug: "energy-transition-vehicles-double",
    headline: "Energy-transition vehicles double their European commitments",
    deck: "Helvetia's second fund close signals institutional appetite beyond the Nordics.",
    publishedOn: "2026-07-10",
    assetClass: "climate",
  },
];

export type MockAuction = {
  id: string;
  title: string;
  seller: string;
  assetType: string;
  country: string;
  deadline: string;
  sizeText: string;
};

export const MOCK_AUCTIONS: MockAuction[] = [
  { id: "mock-au-1", title: "Project Amber — secured corporate NPLs", seller: "Ambra Banca Popolare", assetType: "NPL portfolio", country: "IT", deadline: "2026-08-14", sizeText: "€340m GBV" },
  { id: "mock-au-2", title: "Project Douro — CRE-backed book", seller: "Douro Savings Bank", assetType: "NPL portfolio", country: "PT", deadline: "2026-09-02", sizeText: "€210m GBV" },
  { id: "mock-au-3", title: "Silesia Logistics — going-concern sale", seller: "Court-supervised process", assetType: "Distressed M&A", country: "PL", deadline: "2026-08-28", sizeText: "EV guide €120m" },
];

export type MockEvent = {
  id: string;
  name: string;
  city: string;
  country: string;
  startsOn: string;
  format: "conference" | "roundtable" | "dinner";
};

export const MOCK_EVENTS: MockEvent[] = [
  { id: "mock-ev-1", name: "CEE Private Capital Forum", city: "Warsaw", country: "PL", startsOn: "2026-09-17", format: "conference" },
  { id: "mock-ev-2", name: "European NPL Roundtable", city: "Milan", country: "IT", startsOn: "2026-10-01", format: "roundtable" },
  { id: "mock-ev-3", name: "Nordic LP Dinner", city: "Stockholm", country: "SE", startsOn: "2026-09-24", format: "dinner" },
];

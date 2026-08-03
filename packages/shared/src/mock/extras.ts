/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. Auctions and industry events.
 * Articles moved to ./articles.ts (full tear-sheet shape). Deterministic.
 */

export type MockAuction = {
  id: string;
  title: string;
  seller: string;
  assetType: string;
  country: string;
  deadline: string;
  sizeText: string;
  status: "live" | "second_round" | "closing";
};

export const MOCK_AUCTIONS: MockAuction[] = [
  { id: "mock-au-1", title: "Project Amber — secured corporate NPLs", seller: "Ambra Banca Popolare", assetType: "NPL portfolio", country: "IT", deadline: "2026-08-14", sizeText: "€340m GBV", status: "second_round" },
  { id: "mock-au-2", title: "Project Douro — CRE-backed book", seller: "Douro Savings Bank", assetType: "NPL portfolio", country: "PT", deadline: "2026-09-02", sizeText: "€210m GBV", status: "live" },
  { id: "mock-au-3", title: "Silesia Logistics — going-concern sale", seller: "Court-supervised process", assetType: "Distressed M&A", country: "PL", deadline: "2026-08-28", sizeText: "EV guide €120m", status: "live" },
  { id: "mock-au-4", title: "Project Rila — unsecured consumer book", seller: "Balkan United Bank", assetType: "NPL portfolio", country: "BG", deadline: "2026-09-18", sizeText: "€85m GBV", status: "live" },
  { id: "mock-au-5", title: "Project Kvarner — hospitality loan pool", seller: "Adriatic Banking Supervisor mandate", assetType: "NPL portfolio", country: "HR", deadline: "2026-08-07", sizeText: "€150m GBV", status: "closing" },
  { id: "mock-au-6", title: "Wawel leveraged book — single-name sales", seller: "Wawel Merchant Bank", assetType: "Loan sale", country: "PL", deadline: "2026-09-30", sizeText: "€60m par", status: "live" },
  { id: "mock-au-7", title: "Project Meltemi — mixed retail residual", seller: "Hellas Asset Resolution", assetType: "NPL portfolio", country: "GR", deadline: "2026-08-21", sizeText: "€275m GBV", status: "second_round" },
  { id: "mock-au-8", title: "Danubius shipping receivables", seller: "Bilateral process", assetType: "Specialty finance", country: "AT", deadline: "2026-10-09", sizeText: "€45m", status: "live" },
];

export type MockEvent = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  startsOn: string;
  format: "conference" | "roundtable" | "dinner" | "summit" | "webinar";
  description: string;
  rsvpCount: number;
};

const EVENT_SEED: [string, string, string, string, MockEvent["format"], string, number][] = [
  ["CEE Private Capital Forum", "Warsaw", "PL", "2026-09-17", "conference", "The region's flagship LP/GP gathering — fundraising, exits and the €1bn dry-powder cohort.", 214],
  ["European NPL Roundtable", "Milan", "IT", "2026-10-01", "roundtable", "Sellers, buyers and servicers on the southward rotation. Chatham House rule.", 48],
  ["Nordic LP Dinner", "Stockholm", "SE", "2026-09-24", "dinner", "Closed-door dinner for Nordic institutional allocators.", 22],
  ["Balkans Distressed Summit", "Belgrade", "RS", "2026-10-15", "summit", "First competitive processes in Sofia and Belgrade — the pipeline mapped.", 130],
  ["European CLO Investor Day", "Luxembourg", "LU", "2026-09-10", "conference", "The refi wave, debut managers, and the supervisory perimeter.", 175],
  ["ILS & Cat Bond Forum", "Zurich", "CH", "2026-11-05", "conference", "Mediterranean perils enter the market: modelling, triggers, sponsors.", 160],
  ["Tokenized RWA Working Group", "Tallinn", "EE", "2026-09-03", "roundtable", "Post-audit agenda: enforcement, custody, and the next cohort.", 35],
  ["Iberian Credit Seminar", "Madrid", "ES", "2026-09-29", "conference", "Direct lending and NPL capacity reallocating west.", 145],
  ["Art Finance Breakfast", "Paris", "FR", "2026-09-11", "dinner", "Lending desks, wrappers and valuation regimes for passion assets.", 28],
  ["Baltic Infrastructure Corridor Day", "Vilnius", "LT", "2026-10-08", "summit", "Rail, grid and ports along the new logistics spine.", 190],
  ["European Quant Capacity Forum", "Copenhagen", "DK", "2026-10-22", "conference", "Soft-closes, capacity as alpha, and the mid-tier bid.", 120],
  ["Litigation Funding Assembly", "Amsterdam", "NL", "2026-11-12", "conference", "Pension capital meets duration risk.", 95],
  ["Carbon Markets Standards Sprint", "Oslo", "NO", "2026-09-19", "roundtable", "Verification infrastructure vs the pace of institutional capital.", 40],
  ["CEE Venture Debt Clinic", "Prague", "CZ", "2026-09-25", "webinar", "Filling the Series B gap: structures and pricing.", 310],
  ["Adriatic Hospitality Assets Tour", "Split", "HR", "2026-10-02", "summit", "Value-add repricing on the coast — site visits and data.", 60],
  ["European Servicer Leadership Dinner", "Barcelona", "ES", "2026-10-16", "dinner", "Capacity maps and margin pressure. Invitation only.", 26],
  ["AIFMD II Reporting Workshop", "Dublin", "IE", "2026-11-19", "webinar", "First filings due Q1 2027 — templates walked through.", 420],
  ["Structured Credit Winter Session", "Frankfurt", "DE", "2026-12-03", "conference", "Year-end vintage scorecards and the 2027 pipeline.", 155],
  ["Hellenic Recovery Retrospective", "Athens", "GR", "2026-11-26", "roundtable", "What the deleveraging decade taught the rest of Europe.", 55],
  ["Alternatives & the Agentic Stack", "Berlin", "DE", "2026-12-10", "summit", "MCP, data contracts and machine-readable provenance.", 240],
];

export const MOCK_EVENTS: MockEvent[] = EVENT_SEED.map(([name, city, country, startsOn, format, description, rsvpCount], i) => ({
  id: `mock-ev-${i + 1}`,
  slug: name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, ""),
  name,
  city,
  country,
  startsOn,
  format,
  description,
  rsvpCount,
}));

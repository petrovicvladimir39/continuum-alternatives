/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY.
 *
 * Realistic-but-fictional European alternative-assets entities used to
 * design and build surfaces as they will look WITH data. Never seeded into
 * the database, never rendered unless MOCK_MODE is on (see ./index.ts).
 * Names are invented; any resemblance to real firms is stylistic.
 */

export type MockEntity = {
  id: string;
  name: string;
  slug: string;
  country: string;
  city: string;
  kind: "organization" | "fund_vehicle" | "deal";
  /** Taxonomy asset-class slug (matches --color-class-* tokens). */
  assetClass:
    | "private-equity"
    | "private-credit"
    | "real-assets"
    | "hedge-funds"
    | "structured"
    | "climate"
    | "digital";
  strategy: string;
  role: "gp" | "fund" | "lp" | "lender" | "servicer" | "advisor" | "company";
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function entity(
  id: number,
  name: string,
  country: string,
  city: string,
  assetClass: MockEntity["assetClass"],
  strategy: string,
  role: MockEntity["role"],
  kind: MockEntity["kind"] = "organization",
): MockEntity {
  return { id: `mock-e-${id}`, name, slug: slugify(name), country, city, kind, assetClass, strategy, role };
}

export const MOCK_ENTITIES: MockEntity[] = [
  // ── GPs / managers ────────────────────────────────────────────────────────
  entity(1, "Vistula Growth Partners", "PL", "Warsaw", "private-equity", "buyout", "gp"),
  entity(2, "Hanseatic Capital Management", "DE", "Berlin", "private-equity", "mid-market buyout", "gp"),
  entity(3, "Rive Gauche Capital", "FR", "Paris", "private-equity", "growth", "gp"),
  entity(4, "Grachten Equity Partners", "NL", "Amsterdam", "private-equity", "buyout", "gp"),
  entity(5, "Navigli Ventures", "IT", "Milan", "private-equity", "venture", "gp"),
  entity(6, "Norrström Capital", "SE", "Stockholm", "private-equity", "growth", "gp"),
  entity(7, "Danube Credit Partners", "AT", "Vienna", "private-credit", "direct lending", "gp"),
  entity(8, "Iberia Special Situations", "ES", "Madrid", "private-credit", "special situations", "gp"),
  entity(9, "Carpathian Debt Advisors", "RO", "Bucharest", "private-credit", "NPL investing", "gp"),
  entity(10, "Adria Distressed Opportunities", "HR", "Zagreb", "private-credit", "distressed debt", "gp"),
  entity(11, "Baltic Bridge Infrastructure", "LT", "Vilnius", "real-assets", "infrastructure", "gp"),
  entity(12, "Helvetia Renewables Management", "CH", "Zurich", "climate", "energy transition", "gp"),
  entity(13, "Bohemia Digital Ventures", "CZ", "Prague", "digital", "early-stage VC", "gp"),
  entity(14, "Ægir Structured Finance", "DK", "Copenhagen", "structured", "asset-backed", "gp"),
  entity(15, "Pannonia Equity", "HU", "Budapest", "private-equity", "lower mid-market", "gp"),
  entity(16, "Sava Capital Group", "RS", "Belgrade", "private-credit", "distressed assets", "gp"),
  entity(17, "Atlas Lisboa Partners", "PT", "Lisbon", "private-equity", "growth", "gp"),
  entity(18, "Aegean Yield Partners", "GR", "Athens", "private-credit", "NPL investing", "gp"),
  entity(19, "Fjord Green Capital", "NO", "Oslo", "climate", "climate infrastructure", "gp"),
  entity(20, "Liffey Growth Equity", "IE", "Dublin", "private-equity", "growth", "gp"),
  // ── Fund vehicles ─────────────────────────────────────────────────────────
  entity(21, "Vistula Growth Fund IX", "PL", "Warsaw", "private-equity", "buyout", "fund", "fund_vehicle"),
  entity(22, "Danube Direct Lending Fund III", "AT", "Vienna", "private-credit", "direct lending", "fund", "fund_vehicle"),
  entity(23, "Helvetia Energy Transition Fund II", "CH", "Zurich", "climate", "energy transition", "fund", "fund_vehicle"),
  entity(24, "Baltic Bridge Infra Fund I", "LT", "Vilnius", "real-assets", "infrastructure", "fund", "fund_vehicle"),
  entity(25, "Aegean NPL Recovery Fund II", "GR", "Athens", "private-credit", "NPL investing", "fund", "fund_vehicle"),
  entity(26, "Navigli Ventures Fund IV", "IT", "Milan", "private-equity", "venture", "fund", "fund_vehicle"),
  // ── LPs / institutions ────────────────────────────────────────────────────
  entity(27, "Nordwind Pension Alliance", "DE", "Frankfurt", "private-equity", "LP programme", "lp"),
  entity(28, "Confluence Insurance Group", "FR", "Lyon", "private-credit", "LP programme", "lp"),
  entity(29, "Polaris Sovereign Partners", "SE", "Stockholm", "real-assets", "LP programme", "lp"),
  // ── Lenders / banks ───────────────────────────────────────────────────────
  entity(30, "Wawel Merchant Bank", "PL", "Kraków", "private-credit", "leveraged finance", "lender"),
  entity(31, "Ambra Banca Popolare", "IT", "Turin", "private-credit", "NPL seller", "lender"),
  entity(32, "Douro Savings Bank", "PT", "Porto", "private-credit", "NPL seller", "lender"),
  // ── Servicers / advisors ──────────────────────────────────────────────────
  entity(33, "Meridian Loan Servicing", "ES", "Barcelona", "private-credit", "servicing", "servicer"),
  entity(34, "Tatra Restructuring Advisors", "SK", "Bratislava", "private-credit", "restructuring", "advisor"),
  entity(35, "Amstel Corporate Finance", "NL", "Amsterdam", "private-equity", "M&A advisory", "advisor"),
  // ── Companies (targets / portfolio) ───────────────────────────────────────
  entity(36, "Silesia Logistics Group", "PL", "Katowice", "private-equity", "portfolio company", "company"),
  entity(37, "Alpenmilch Dairy Holding", "AT", "Innsbruck", "private-equity", "portfolio company", "company"),
  entity(38, "Tulip BioMedical", "NL", "Leiden", "private-equity", "portfolio company", "company"),
  entity(39, "Vesuvio Foods S.p.A.", "IT", "Naples", "private-equity", "portfolio company", "company"),
  entity(40, "Kalevala Gaming Studios", "FI", "Helsinki", "digital", "portfolio company", "company"),
];

export const MOCK_ENTITY_BY_ID: ReadonlyMap<string, MockEntity> = new Map(
  MOCK_ENTITIES.map((e) => [e.id, e]),
);

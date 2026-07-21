import { mulberry32 } from "../npl-sim";
import { MOCK_ENTITIES } from "./entities";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. ~250 edges forming a genuinely
 * connected graph across all nine asset classes (GPs manage funds, funds
 * invest in companies, LPs commit, advisors advise, servicers service,
 * lenders sell, regulators supervise). Deterministic (seeded). Members live
 * in ./threads.ts.
 */

export type MockEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType:
    | "manages"
    | "invested_in"
    | "lp_in"
    | "advised_on"
    | "acquired"
    | "serviced_by"
    | "sold_portfolio_to"
    | "supervises"
    | "co_invested";
};

function byRole(role: string): typeof MOCK_ENTITIES {
  return MOCK_ENTITIES.filter((e) => e.role === role);
}

export function buildMockEdges(): MockEdge[] {
  const rand = mulberry32(97);
  const edges: MockEdge[] = [];
  let n = 0;
  const add = (sourceId: string, targetId: string, edgeType: MockEdge["edgeType"]) => {
    if (
      sourceId !== targetId &&
      !edges.some((x) => x.sourceId === sourceId && x.targetId === targetId && x.edgeType === edgeType)
    ) {
      edges.push({ id: `mock-edge-${++n}`, sourceId, targetId, edgeType });
    }
  };

  const gps = byRole("gp");
  const funds = byRole("fund");
  const companies = byRole("company");
  const lps = byRole("lp");
  const lenders = byRole("lender");
  const advisors = byRole("advisor");
  const servicers = byRole("servicer");
  const regulators = byRole("regulator");

  // Every fund is managed by a same-class GP where one exists.
  for (const fund of funds) {
    const sameClass = gps.filter((g) => g.assetClass === fund.assetClass);
    const manager = sameClass.length > 0 ? sameClass[Math.floor(rand() * sameClass.length)]! : gps[Math.floor(rand() * gps.length)]!;
    add(manager.id, fund.id, "manages");
  }
  // Funds and GPs invest in companies (multiple investors per company).
  for (let i = 0; i < 95; i++) {
    const investor = rand() < 0.5 ? funds[Math.floor(rand() * funds.length)]! : gps[Math.floor(rand() * gps.length)]!;
    add(investor.id, companies[Math.floor(rand() * companies.length)]!.id, rand() < 0.3 ? "acquired" : "invested_in");
  }
  // LP commitments — 8 per LP across the fund shelf.
  for (const lp of lps) {
    for (let i = 0; i < 8; i++) {
      add(lp.id, funds[Math.floor(rand() * funds.length)]!.id, "lp_in");
    }
  }
  // GP↔GP co-investments inside a class.
  for (let i = 0; i < 20; i++) {
    const a = gps[Math.floor(rand() * gps.length)]!;
    const sameClass = gps.filter((g) => g.assetClass === a.assetClass && g.id !== a.id);
    if (sameClass.length > 0) {
      add(a.id, sameClass[Math.floor(rand() * sameClass.length)]!.id, "co_invested");
    }
  }
  // Advisory + servicing + NPL trades.
  for (let i = 0; i < 40; i++) {
    add(
      advisors[Math.floor(rand() * advisors.length)]!.id,
      [...companies, ...gps][Math.floor(rand() * (companies.length + gps.length))]!.id,
      "advised_on",
    );
  }
  for (let i = 0; i < 16; i++) {
    add(companies[Math.floor(rand() * companies.length)]!.id, servicers[Math.floor(rand() * servicers.length)]!.id, "serviced_by");
  }
  const creditGps = gps.filter((g) => g.assetClass === "private-credit");
  for (let i = 0; i < 18; i++) {
    add(lenders[Math.floor(rand() * lenders.length)]!.id, creditGps[Math.floor(rand() * creditGps.length)]!.id, "sold_portfolio_to");
  }
  // Regulators supervise same-country organizations.
  for (const reg of regulators) {
    const domestic = MOCK_ENTITIES.filter(
      (e) => e.country === reg.country && e.role !== "regulator" && e.kind === "organization",
    );
    for (const target of domestic.slice(0, 5)) {
      add(reg.id, target.id, "supervises");
    }
  }
  return edges;
}

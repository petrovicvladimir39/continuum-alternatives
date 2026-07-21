import { mulberry32 } from "../npl-sim";
import { MOCK_ENTITIES } from "./entities";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. ~120 edges forming a genuinely
 * connected graph (GPs manage funds, funds invest in companies, LPs commit,
 * advisors advise, servicers service, lenders sell), plus ~15 members for
 * network/attendee surfaces. Deterministic (seeded).
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
    | "sold_portfolio_to";
};

function byRole(role: string): typeof MOCK_ENTITIES {
  return MOCK_ENTITIES.filter((e) => e.role === role);
}

export function buildMockEdges(): MockEdge[] {
  const rand = mulberry32(97);
  const edges: MockEdge[] = [];
  let n = 0;
  const add = (sourceId: string, targetId: string, edgeType: MockEdge["edgeType"]) => {
    if (sourceId !== targetId && !edges.some((x) => x.sourceId === sourceId && x.targetId === targetId && x.edgeType === edgeType)) {
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

  // Every fund has a manager; spread extra vehicles across GPs.
  funds.forEach((fund, i) => add(gps[i % gps.length]!.id, fund.id, "manages"));
  for (let i = 0; i < 14; i++) {
    add(gps[Math.floor(rand() * gps.length)]!.id, funds[Math.floor(rand() * funds.length)]!.id, "manages");
  }
  // Funds and GPs invest in companies (multiple investors per company).
  for (let i = 0; i < 40; i++) {
    const investor = rand() < 0.5 ? funds[Math.floor(rand() * funds.length)]! : gps[Math.floor(rand() * gps.length)]!;
    add(investor.id, companies[Math.floor(rand() * companies.length)]!.id, rand() < 0.3 ? "acquired" : "invested_in");
  }
  // LP commitments.
  for (const lp of lps) {
    for (let i = 0; i < 6; i++) {
      add(lp.id, funds[Math.floor(rand() * funds.length)]!.id, "lp_in");
    }
  }
  // Advisory + servicing + NPL trades.
  for (let i = 0; i < 18; i++) {
    add(advisors[Math.floor(rand() * advisors.length)]!.id, [...companies, ...gps][Math.floor(rand() * (companies.length + gps.length))]!.id, "advised_on");
  }
  for (let i = 0; i < 10; i++) {
    add(companies[Math.floor(rand() * companies.length)]!.id, servicers[Math.floor(rand() * servicers.length)]!.id, "serviced_by");
  }
  const creditGps = gps.filter((g) => g.assetClass === "private-credit");
  for (let i = 0; i < 12; i++) {
    add(lenders[Math.floor(rand() * lenders.length)]!.id, creditGps[Math.floor(rand() * creditGps.length)]!.id, "sold_portfolio_to");
  }
  return edges;
}

export type MockMember = {
  id: string;
  name: string;
  roleTitle: string;
  organization: string;
  /** Two-letter monogram used where an avatar renders. */
  monogram: string;
};

const MEMBER_SEED: [string, string, string][] = [
  ["Marta Kowalska", "Partner", "Vistula Growth Partners"],
  ["Jonas Weber", "Managing Director", "Hanseatic Capital Management"],
  ["Claire Moreau", "Investment Director", "Rive Gauche Capital"],
  ["Piotr Nowak", "Head of Credit", "Danube Credit Partners"],
  ["Elena Rossi", "Principal", "Navigli Ventures"],
  ["Henrik Lindqvist", "Partner", "Norrström Capital"],
  ["Sofia Papadopoulou", "Portfolio Manager", "Aegean Yield Partners"],
  ["Tomáš Horák", "Partner", "Bohemia Digital Ventures"],
  ["Inês Silva", "Director", "Atlas Lisboa Partners"],
  ["Lars Jansen", "COO", "Grachten Equity Partners"],
  ["Ana Jurić", "Head of Workouts", "Adria Distressed Opportunities"],
  ["Mikkel Sørensen", "Structurer", "Ægir Structured Finance"],
  ["Réka Nagy", "Investment Manager", "Pannonia Equity"],
  ["Nikola Petrović", "Director", "Sava Capital Group"],
  ["Aoife Byrne", "Partner", "Liffey Growth Equity"],
];

export const MOCK_MEMBERS: MockMember[] = MEMBER_SEED.map(([name, roleTitle, organization], i) => ({
  id: `mock-m-${i + 1}`,
  name,
  roleTitle,
  organization,
  monogram: name
    .split(" ")
    .map((w) => w[0]!)
    .slice(0, 2)
    .join(""),
}));

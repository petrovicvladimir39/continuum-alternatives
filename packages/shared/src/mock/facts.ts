import { mulberry32 } from "../npl-sim";
import { MOCK_ENTITIES, type MockEntity } from "./entities";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. ~200 seeded, deterministic
 * timeline facts with actor+action headlines across varied event types.
 * Timestamps are generated RELATIVE TO RENDER TIME so "5h ago" lines look
 * alive in design review; ordering and content are PRNG-seeded and stable.
 */

export type MockFactType =
  | "fund_close"
  | "acquisition"
  | "funding_round"
  | "npl_sale"
  | "people_move"
  | "credit_event"
  | "insolvency"
  | "mandate"
  | "exit";

export type MockFact = {
  id: string;
  entityId: string;
  /** ISO date (occurred). */
  occurredOn: string;
  /** ISO datetime (recorded into the record) — drives "Nh ago". */
  recordedAt: string;
  factType: MockFactType;
  title: string;
  contextLine: string | null;
  channels: string[];
  sourceName: string;
  sourceUrl: string | null;
};

const AMOUNTS_M = [45, 60, 85, 120, 150, 210, 275, 340, 420, 500, 650, 800, 1100, 1400, 2100];
const SOURCES: [string, string | null][] = [
  ["Press release", "https://example.invalid/press"],
  ["Regulatory filing", null],
  ["Company statement", "https://example.invalid/statement"],
  ["Court gazette", null],
  ["Industry press", "https://example.invalid/article"],
];

type Template = {
  factType: MockFactType;
  channels: string[];
  weight: number;
  pick: (rand: () => number) => MockEntity;
  make: (e: MockEntity, rand: () => number) => { title: string; context: string | null };
};

function byRole(role: MockEntity["role"] | MockEntity["role"][]): MockEntity[] {
  const roles = Array.isArray(role) ? role : [role];
  return MOCK_ENTITIES.filter((e) => roles.includes(e.role));
}

function pickFrom(list: MockEntity[]): (rand: () => number) => MockEntity {
  return (rand) => list[Math.floor(rand() * list.length)]!;
}

function amount(rand: () => number): string {
  const value = AMOUNTS_M[Math.floor(rand() * AMOUNTS_M.length)]!;
  return value >= 1000 ? `€${(value / 1000).toFixed(1)}bn` : `€${value}m`;
}

const gps = byRole("gp");
const funds = byRole("fund");
const companies = byRole("company");
const lenders = byRole("lender");
const advisors = byRole(["advisor", "servicer"]);
const lps = byRole("lp");

const FIRST = ["Marta", "Jonas", "Claire", "Piotr", "Elena", "Henrik", "Sofia", "Tomáš", "Ines", "Lars"];
const LAST = ["Kowalska", "Weber", "Moreau", "Novak", "Rossi", "Lindqvist", "Papadopoulos", "Horvat", "Silva", "Jansen"];
const TITLES = ["Partner", "Managing Director", "Head of Credit", "Investment Director", "COO", "Head of ESG"];

const TEMPLATES: Template[] = [
  {
    factType: "fund_close",
    channels: ["pe", "lp_institutional"],
    weight: 3,
    pick: pickFrom(gps),
    make: (e, rand) => ({
      title: `${e.name} closed ${funds[Math.floor(rand() * funds.length)]!.name.replace(/ Fund .*$/, "")} ${["Fund II", "Fund III", "Fund IV", "Fund IX"][Math.floor(rand() * 4)]} at ${amount(rand)}`,
      context: `${["Oversubscribed against a", "Final close above the", "Hard cap met on a"][Math.floor(rand() * 3)]} ${amount(rand)} target · ${e.strategy}`,
    }),
  },
  {
    factType: "acquisition",
    channels: ["pe"],
    weight: 3,
    pick: pickFrom(gps),
    make: (e, rand) => {
      const target = companies[Math.floor(rand() * companies.length)]!;
      return {
        title: `${e.name} acquired ${target.name}`,
        context: `${["Majority stake", "Carve-out from founder ownership", "Secondary buyout", "Take-private"][Math.floor(rand() * 4)]} · EV ${amount(rand)}`,
      };
    },
  },
  {
    factType: "funding_round",
    channels: ["vc_founders"],
    weight: 3,
    pick: pickFrom(companies),
    make: (e, rand) => ({
      title: `${e.name} raised a ${amount(rand)} ${["Series A", "Series B", "Series C", "growth"][Math.floor(rand() * 4)]} round`,
      context: `Led by ${gps[Math.floor(rand() * gps.length)]!.name} · ${["with existing investors participating", "first institutional round", "extension of the prior round"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "npl_sale",
    channels: ["distressed", "private_credit"],
    weight: 3,
    pick: pickFrom(lenders),
    make: (e, rand) => ({
      title: `${e.name} sold a ${amount(rand)} NPL portfolio to ${byRole("gp").filter((g) => g.assetClass === "private-credit")[Math.floor(rand() * 4)]!.name}`,
      context: `${["Secured corporate exposures", "Mixed retail book", "CRE-backed portfolio", "Unsecured consumer book"][Math.floor(rand() * 4)]} · ${["competitive process", "bilateral sale"][Math.floor(rand() * 2)]}`,
    }),
  },
  {
    factType: "people_move",
    channels: ["pe", "vendors"],
    weight: 2,
    pick: pickFrom([...gps, ...advisors]),
    make: (e, rand) => ({
      title: `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]} joined ${e.name} as ${TITLES[Math.floor(rand() * TITLES.length)]}`,
      context: `${["From a bulge-bracket credit desk", "Internal promotion", "Returning from a sovereign fund", "Second senior hire this year"][Math.floor(rand() * 4)]}`,
    }),
  },
  {
    factType: "credit_event",
    channels: ["private_credit", "distressed"],
    weight: 2,
    pick: pickFrom(companies),
    make: (e, rand) => ({
      title: `${e.name} ${["breached leverage covenants", "agreed an amend-and-extend", "drew its RCF in full", "missed a coupon payment"][Math.floor(rand() * 4)]}`,
      context: `Lenders led by ${lenders[Math.floor(rand() * lenders.length)]!.name} · ${["waiver under negotiation", "standstill agreed", "advisors appointed"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "insolvency",
    channels: ["distressed"],
    weight: 2,
    pick: pickFrom(companies),
    make: (e, rand) => ({
      title: `${e.name} entered ${["preventive restructuring", "insolvency proceedings", "court-supervised reorganisation"][Math.floor(rand() * 3)]}`,
      context: `${advisors[Math.floor(rand() * advisors.length)]!.name} appointed · ${["going-concern sale sought", "creditor committee formed"][Math.floor(rand() * 2)]}`,
    }),
  },
  {
    factType: "mandate",
    channels: ["vendors", "lp_institutional"],
    weight: 2,
    pick: pickFrom(lps),
    make: (e, rand) => ({
      title: `${e.name} committed ${amount(rand)} to ${funds[Math.floor(rand() * funds.length)]!.name}`,
      context: `${["First commitment to the strategy", "Re-up from the prior vintage", "Co-investment rights attached"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "exit",
    channels: ["pe"],
    weight: 2,
    pick: pickFrom(gps),
    make: (e, rand) => {
      const target = companies[Math.floor(rand() * companies.length)]!;
      return {
        title: `${e.name} exited ${target.name} ${["to a strategic buyer", "via secondary sale", "in a dual-track process"][Math.floor(rand() * 3)]}`,
        context: `Advised by ${advisors[Math.floor(rand() * advisors.length)]!.name} · ${["reported 2.8x gross", "return undisclosed"][Math.floor(rand() * 2)]}`,
      };
    },
  },
];

const FACT_COUNT = 200;

/** Deterministic content; timestamps spread over the ~45 days before render. */
export function buildMockFacts(now: Date = new Date()): MockFact[] {
  const rand = mulberry32(20260721);
  const weighted: Template[] = TEMPLATES.flatMap((t) => Array.from({ length: t.weight }, () => t));
  const facts: MockFact[] = [];
  for (let i = 0; i < FACT_COUNT; i++) {
    const template = weighted[Math.floor(rand() * weighted.length)]!;
    const e = template.pick(rand);
    const { title, context } = template.make(e, rand);
    // Newest items cluster in the last hours; the tail spreads across ~45 days.
    const ageHours = i < 8 ? 1 + rand() * 20 : 24 + rand() * 24 * 44;
    const recorded = new Date(now.getTime() - ageHours * 3600_000);
    const occurred = new Date(recorded.getTime() - rand() * 3 * 86400_000);
    const source = SOURCES[Math.floor(rand() * SOURCES.length)]!;
    facts.push({
      id: `mock-f-${i + 1}`,
      entityId: e.id,
      occurredOn: occurred.toISOString().slice(0, 10),
      recordedAt: recorded.toISOString(),
      factType: template.factType,
      title,
      contextLine: context,
      channels: template.channels,
      sourceName: source[0],
      sourceUrl: source[1],
    });
  }
  return facts.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

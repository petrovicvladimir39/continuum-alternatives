import { mulberry32 } from "../npl-sim";
import { MOCK_ENTITIES, type MockEntity } from "./entities";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. ~400 seeded, deterministic
 * timeline facts with actor+action headlines across ALL NINE asset classes.
 * Timestamps are generated RELATIVE TO RENDER TIME so "5h ago" lines look
 * alive in design review; ordering and content are PRNG-seeded and stable.
 * Amounts are fixture constants — no arithmetic is ever delegated to LLMs.
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
  | "exit"
  | "hf_launch"
  | "securitisation"
  | "esoteric_deal"
  | "collectibles_sale"
  | "climate_issue"
  | "digital_issue"
  | "regulatory"
  | "auction_update";

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
  /** Seed for a prototype thumbnail (picsum); null = text-only row. */
  imageSeed: string | null;
};

const AMOUNTS_M = [45, 60, 85, 120, 150, 210, 275, 340, 420, 500, 650, 800, 1100, 1400, 2100];
const SOURCES: [string, string | null][] = [
  ["Press release", "https://example.invalid/press"],
  ["Regulatory filing", null],
  ["Company statement", "https://example.invalid/statement"],
  ["Court gazette", null],
  ["Industry press", "https://example.invalid/article"],
  ["Register extract", null],
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

function byClass(cls: MockEntity["assetClass"], role?: MockEntity["role"]): MockEntity[] {
  return MOCK_ENTITIES.filter(
    (e) => e.assetClass === cls && (role === undefined || e.role === role),
  );
}

function one<T>(list: T[]): (rand: () => number) => T {
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
const regulators = byRole("regulator");
const creditGps = byClass("private-credit", "gp");
const hfManagers = byClass("hedge-funds", "gp");
const structuredMgrs = byClass("structured", "gp");
const esotericMgrs = byClass("esoteric", "gp");
const collectiblesMgrs = byClass("collectibles", "gp");
const climateMgrs = byClass("climate", "gp");
const digitalMgrs = byClass("digital", "gp");

const FIRST = ["Marta", "Jonas", "Claire", "Piotr", "Elena", "Henrik", "Sofia", "Tomáš", "Inês", "Lars", "Ana", "Mikkel", "Réka", "Nikola", "Aoife", "Zofia", "Dario", "Freja"];
const LAST = ["Kowalska", "Weber", "Moreau", "Novak", "Rossi", "Lindqvist", "Papadopoulos", "Horvat", "Silva", "Jansen", "Jurić", "Sørensen", "Nagy", "Petrović", "Byrne", "Marinescu", "Kovač", "Andersen"];
const TITLES = ["Partner", "Managing Director", "Head of Credit", "Investment Director", "COO", "Head of ESG", "Portfolio Manager", "Head of Capital Formation"];

const TEMPLATES: Template[] = [
  {
    factType: "fund_close",
    channels: ["pe", "lp_institutional"],
    weight: 3,
    pick: one(gps),
    make: (e, rand) => ({
      title: `${e.name} closed ${["Fund II", "Fund III", "Fund IV", "Fund V"][Math.floor(rand() * 4)]} at ${amount(rand)}`,
      context: `${["Oversubscribed against a", "Final close above the", "Hard cap met on a"][Math.floor(rand() * 3)]} ${amount(rand)} target · ${e.strategy}`,
    }),
  },
  {
    factType: "acquisition",
    channels: ["pe"],
    weight: 3,
    pick: one(byClass("private-equity", "gp")),
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
    weight: 2,
    pick: one(companies),
    make: (e, rand) => ({
      title: `${e.name} raised a ${amount(rand)} ${["Series A", "Series B", "Series C", "growth"][Math.floor(rand() * 4)]} round`,
      context: `Led by ${gps[Math.floor(rand() * gps.length)]!.name} · ${["with existing investors participating", "first institutional round", "extension of the prior round"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "npl_sale",
    channels: ["distressed", "private_credit"],
    weight: 3,
    pick: one(lenders),
    make: (e, rand) => ({
      title: `${e.name} sold a ${amount(rand)} NPL portfolio to ${creditGps[Math.floor(rand() * creditGps.length)]!.name}`,
      context: `${["Secured corporate exposures", "Mixed retail book", "CRE-backed portfolio", "Unsecured consumer book"][Math.floor(rand() * 4)]} · ${["competitive process", "bilateral sale"][Math.floor(rand() * 2)]}`,
    }),
  },
  {
    factType: "people_move",
    channels: ["pe", "vendors"],
    weight: 2,
    pick: one([...gps, ...advisors]),
    make: (e, rand) => ({
      title: `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]} joined ${e.name} as ${TITLES[Math.floor(rand() * TITLES.length)]}`,
      context: `${["From a bulge-bracket credit desk", "Internal promotion", "Returning from a sovereign fund", "Second senior hire this year"][Math.floor(rand() * 4)]}`,
    }),
  },
  {
    factType: "credit_event",
    channels: ["private_credit", "distressed"],
    weight: 2,
    pick: one(companies),
    make: (e, rand) => ({
      title: `${e.name} ${["breached leverage covenants", "agreed an amend-and-extend", "drew its RCF in full", "missed a coupon payment"][Math.floor(rand() * 4)]}`,
      context: `Lenders led by ${lenders[Math.floor(rand() * lenders.length)]!.name} · ${["waiver under negotiation", "standstill agreed", "advisors appointed"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "insolvency",
    channels: ["distressed"],
    weight: 2,
    pick: one(companies),
    make: (e, rand) => ({
      title: `${e.name} entered ${["preventive restructuring", "insolvency proceedings", "court-supervised reorganisation"][Math.floor(rand() * 3)]}`,
      context: `${advisors[Math.floor(rand() * advisors.length)]!.name} appointed · ${["going-concern sale sought", "creditor committee formed"][Math.floor(rand() * 2)]}`,
    }),
  },
  {
    factType: "mandate",
    channels: ["vendors", "lp_institutional"],
    weight: 2,
    pick: one(lps),
    make: (e, rand) => ({
      title: `${e.name} committed ${amount(rand)} to ${funds[Math.floor(rand() * funds.length)]!.name}`,
      context: `${["First commitment to the strategy", "Re-up from the prior vintage", "Co-investment rights attached"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "exit",
    channels: ["pe"],
    weight: 2,
    pick: one(byClass("private-equity", "gp")),
    make: (e, rand) => {
      const target = companies[Math.floor(rand() * companies.length)]!;
      return {
        title: `${e.name} exited ${target.name} ${["to a strategic buyer", "via secondary sale", "in a dual-track process"][Math.floor(rand() * 3)]}`,
        context: `Advised by ${advisors[Math.floor(rand() * advisors.length)]!.name} · ${["reported 2.8x gross", "return undisclosed"][Math.floor(rand() * 2)]}`,
      };
    },
  },
  {
    factType: "hf_launch",
    channels: ["hedge_funds"],
    weight: 2,
    pick: one(hfManagers),
    make: (e, rand) => ({
      title: `${e.name} ${["launched a UCITS sleeve of its", "opened capacity in its", "reported a record month for its", "soft-closed its"][Math.floor(rand() * 4)]} ${e.strategy.toLowerCase()} strategy`,
      context: `${["Founders' share class open", "Capacity capped at", "Estimated net exposure held under", "Pension demand led by"][Math.floor(rand() * 4)]} ${amount(rand)} · ${e.city}`,
    }),
  },
  {
    factType: "securitisation",
    channels: ["structured"],
    weight: 2,
    pick: one(structuredMgrs),
    make: (e, rand) => ({
      title: `${e.name} priced a ${amount(rand)} ${e.strategy} transaction`,
      context: `${["AAA tranche inside guidance", "Upsized on demand", "First euro deal of the vintage", "Refinancing of the 2023 stack"][Math.floor(rand() * 4)]} · ${["retained junior notes", "fully placed"][Math.floor(rand() * 2)]}`,
    }),
  },
  {
    factType: "esoteric_deal",
    channels: ["esoteric"],
    weight: 2,
    pick: one(esotericMgrs),
    make: (e, rand) => ({
      title: `${e.name} ${["funded a portfolio of commercial claims", "acquired a royalty stream", "signed a sale-and-leaseback for six narrowbodies", "closed a structured settlement book"][Math.floor(rand() * 4)]} at ${amount(rand)}`,
      context: `${e.strategy} · ${["multi-year deployment", "co-investment with an LP", "second deal with the counterparty"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "collectibles_sale",
    channels: ["collectibles"],
    weight: 1,
    pick: one(collectiblesMgrs),
    make: (e, rand) => ({
      title: `${e.name} ${["realised a post-war painting at auction", "added a 1960s GT collection", "released a cask tranche to members", "syndicated a horology portfolio"][Math.floor(rand() * 4)]}`,
      context: `${e.strategy} · ${["hammer above high estimate", "private treaty", "insured value updated"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "climate_issue",
    channels: ["climate"],
    weight: 2,
    pick: one(climateMgrs),
    make: (e, rand) => ({
      title: `${e.name} ${["issued a catastrophe bond", "closed a carbon-credit offtake", "priced an ILS tranche", "signed a PPA-backed facility"][Math.floor(rand() * 4)]} at ${amount(rand)}`,
      context: `${e.strategy} · ${["European wind peril", "voluntary market credits", "parametric trigger", "ten-year tenor"][Math.floor(rand() * 4)]}`,
    }),
  },
  {
    factType: "digital_issue",
    channels: ["digital"],
    weight: 2,
    pick: one(digitalMgrs),
    make: (e, rand) => ({
      title: `${e.name} ${["tokenized a private-credit pool", "expanded data-center capacity", "listed a regulated custody product", "closed a validator-infrastructure round"][Math.floor(rand() * 4)]} worth ${amount(rand)}`,
      context: `${e.strategy} · ${["MiCA-aligned structure", "institutional custody", "GPU capacity pre-sold"][Math.floor(rand() * 3)]}`,
    }),
  },
  {
    factType: "regulatory",
    channels: ["regulatory"],
    weight: 2,
    pick: one(regulators),
    make: (e, rand) => ({
      title: `${e.name} ${["opened a consultation on", "published guidance on", "fined a market participant over", "granted a licence under"][Math.floor(rand() * 4)]} ${["AIFMD reporting", "NPL servicing standards", "securitisation risk retention", "crypto-asset custody", "ILS authorisation"][Math.floor(rand() * 5)]}`,
      context: `${["Comment period closes in six weeks", "Effective next quarter", "First enforcement of its kind", "Follows an EBA opinion"][Math.floor(rand() * 4)]}`,
    }),
  },
  {
    factType: "auction_update",
    channels: ["distressed", "private_credit"],
    weight: 1,
    pick: one(lenders),
    make: (e, rand) => ({
      title: `Bid deadline ${["extended", "confirmed", "moved up"][Math.floor(rand() * 3)]} for ${e.name}'s ${amount(rand)} portfolio sale`,
      context: `${["Second-round bidders shortlisted", "Data room opened", "Stalking-horse bid disclosed"][Math.floor(rand() * 3)]}`,
    }),
  },
];

const FACT_COUNT = 400;
/** Fact types that render with a prototype thumbnail in feed/tear sheets. */
const IMAGE_TYPES = new Set<MockFactType>([
  "fund_close",
  "acquisition",
  "exit",
  "securitisation",
  "climate_issue",
  "collectibles_sale",
]);

/** Deterministic content; timestamps spread over the ~60 days before render. */
export function buildMockFacts(now: Date = new Date()): MockFact[] {
  const rand = mulberry32(20260721);
  const weighted: Template[] = TEMPLATES.flatMap((t) => Array.from({ length: t.weight }, () => t));
  const facts: MockFact[] = [];
  for (let i = 0; i < FACT_COUNT; i++) {
    const template = weighted[Math.floor(rand() * weighted.length)]!;
    const e = template.pick(rand);
    const { title, context } = template.make(e, rand);
    // Newest items cluster in the last hours; the tail spreads across ~60 days.
    const ageHours = i < 12 ? 1 + rand() * 20 : 24 + rand() * 24 * 59;
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
      imageSeed: IMAGE_TYPES.has(template.factType) && rand() < 0.55 ? `fact-${i + 1}` : null,
    });
  }
  return facts.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

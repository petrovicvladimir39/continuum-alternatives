import { mulberry32 } from "../npl-sim";
import { MOCK_ENTITIES, type MockEntity } from "./entities";

/**
 * MOCK DATA LAYER — DESIGN SCAFFOLDING ONLY. ~25 members and ~40 threads
 * with replies for the Network & Threads surface. Post bodies embed entity
 * mentions as "@{Entity Name}" tokens — renderers split on the token and
 * resolve names against MOCK_ENTITIES for hover-cards. Deterministic;
 * timestamps generated relative to render time.
 */

export type MockMember = {
  id: string;
  name: string;
  roleTitle: string;
  organization: string;
  country: string;
  /** Two-letter monogram fallback. */
  monogram: string;
  /** DiceBear seed (generated geometry — never real people). */
  avatarSeed: string;
};

const MEMBER_SEED: [string, string, string, string][] = [
  ["Marta Kowalska", "Partner", "Vistula Growth Partners", "PL"],
  ["Jonas Weber", "Managing Director", "Hanseatic Capital Management", "DE"],
  ["Claire Moreau", "Investment Director", "Rive Gauche Capital", "FR"],
  ["Piotr Nowak", "Head of Credit", "Danube Credit Partners", "AT"],
  ["Elena Rossi", "Principal", "Navigli Ventures", "IT"],
  ["Henrik Lindqvist", "Partner", "Norrström Capital", "SE"],
  ["Sofia Papadopoulou", "Portfolio Manager", "Aegean Yield Partners", "GR"],
  ["Tomáš Horák", "Partner", "Bohemia Digital Ventures", "CZ"],
  ["Inês Silva", "Director", "Atlas Lisboa Partners", "PT"],
  ["Lars Jansen", "COO", "Grachten Equity Partners", "NL"],
  ["Ana Jurić", "Head of Workouts", "Adria Distressed Opportunities", "HR"],
  ["Mikkel Sørensen", "Structurer", "Ægir Structured Finance", "DK"],
  ["Réka Nagy", "Investment Manager", "Pannonia Equity", "HU"],
  ["Nikola Petrović", "Director", "Sava Capital Group", "RS"],
  ["Aoife Byrne", "Partner", "Liffey Growth Equity", "IE"],
  ["Zofia Lis", "Quant Researcher", "Chopin Convertible Partners", "PL"],
  ["Dario Conti", "Head of Art Finance", "Uffizi Art Capital", "IT"],
  ["Freja Andersen", "PM, Systematic", "Øresund Quant Capital", "DK"],
  ["Luc Fontaine", "ILS Underwriter", "Polder Re ILS Management", "NL"],
  ["Katrin Muller", "CLO Analyst", "Moselle CLO Management", "LU"],
  ["Andrei Marinescu", "NPL Trader", "Carpathian Debt Advisors", "RO"],
  ["Eleni Stavrou", "Servicing Lead", "Hellas Asset Resolution", "GR"],
  ["Bjørn Haugen", "Head of Compute", "Fjell Compute Partners", "NO"],
  ["Camille Renard", "Carbon Strategist", "Mistral Carbon Exchange", "FR"],
  ["Matej Zupan", "Royalties Analyst", "Karst Pharma Royalties", "SI"],
];

export const MOCK_MEMBERS: MockMember[] = MEMBER_SEED.map(([name, roleTitle, organization, country], i) => ({
  id: `mock-m-${i + 1}`,
  name,
  roleTitle,
  organization,
  country,
  monogram: name
    .split(" ")
    .map((w) => w[0]!)
    .slice(0, 2)
    .join(""),
  avatarSeed: `member-${i + 1}`,
}));

export type MockThreadPost = {
  id: string;
  memberId: string;
  /** ISO datetime, relative to render. */
  postedAt: string;
  /** Body with "@{Entity Name}" mention tokens. */
  body: string;
};

export type MockThread = {
  id: string;
  /** Root post; replies follow. */
  root: MockThreadPost;
  replies: MockThreadPost[];
  /** Dashed asset-class slug driving the accent slot. */
  assetClass: MockEntity["assetClass"];
  validates: number;
  disputes: number;
  saves: number;
};

type Names = { a: string; b: string };

type ThreadTemplate = {
  assetClass: MockEntity["assetClass"];
  body: (n: Names) => string;
  replies: ((n: Names) => string)[];
};

const THREAD_TEMPLATES: ThreadTemplate[] = [
  {
    assetClass: "private-equity",
    body: (n) => `Hearing @{${n.a}} turned away ~€200m to hold the hard cap. The CEE re-rating is real — LPs who bracketed the region as frontier risk are re-cutting Europe sleeves.`,
    replies: [
      () => `Confirmed from the LP side. We re-upped at 2x our prior ticket. The 2016-2021 vintages speak for themselves.`,
      () => `Worth watching what this does to entry multiples in Poland — local banks back at 6x leverage already.`,
    ],
  },
  {
    assetClass: "private-credit",
    body: (n) => `Project Douro data room is open. If @{${n.a}} wins this one, that's three Iberian books in a quarter. The southward rotation is not a blip.`,
    replies: [
      () => `Pricing tension is real — low forties for secured Portuguese CRE vs low thirties for equivalent CEE risk.`,
      (n) => `@{${n.b}} is the natural servicing partner whoever wins. Porto hiring spree makes sense now.`,
      () => `Disagree on "not a blip" — the CEE pipeline is just delayed, not dead. Two Romanian books coming in Q4.`,
    ],
  },
  {
    assetClass: "structured",
    body: (n) => `@{${n.a}} priced the AAA inside guidance. Deepest book since 2021 per two arrangers. The machine is officially restarted.`,
    replies: [
      () => `Mezz still thin though. Equity arb works at current loan spreads but one repricing and it's shut again.`,
      () => `A third of the 2021 vintage callable this year — refi wave will dominate H2 issuance.`,
    ],
  },
  {
    assetClass: "hedge-funds",
    body: (n) => `@{${n.a}} soft-closing again. European quant capacity is the binding constraint — allocators moving down the size curve to mid-tier systematic shops.`,
    replies: [
      () => `We looked at three mid-sized systematic managers this quarter. Fee terms improving for allocators at that end.`,
    ],
  },
  {
    assetClass: "climate",
    body: (n) => `First Greek windstorm bond priced. @{${n.a}} got parametric triggers over indemnity — the market's telling you where modelling confidence sits.`,
    replies: [
      () => `Mediterranean perils were uninsurable at scale five years ago. The modelling caught up fast.`,
      () => `Serbian flood note next. Balkan sponsors watching closely.`,
    ],
  },
  {
    assetClass: "digital",
    body: (n) => `The @{${n.a}} audited cycle is the real story in RWA — zero reconciliation breaks across 14 positions. Default enforcement is the open question nobody's tested.`,
    replies: [
      () => `Exactly. The on-chain claim vs off-chain insolvency interface is where the lawyers earn their fees.`,
      (n) => `Custody was the gate. With @{${n.b}} authorised under MiCA the institutional rails exist now.`,
    ],
  },
  {
    assetClass: "esoteric",
    body: (n) => `Pension money in litigation finance — @{${n.a}} got two retirement systems into Fund III. Duration is the caveat: court backlogs are stretching resolution profiles.`,
    replies: [
      () => `Settlement dynamics matter more than judgment outcomes for realised IRRs now.`,
    ],
  },
  {
    assetClass: "real-assets",
    body: (n) => `The Baltic corridor pipeline now exceeds the combined national infra budgets of all three states. @{${n.a}} closing Fund I on rail and grid is the entry point.`,
    replies: [
      () => `Operating-asset recycling programmes are the way in. Greenfield risk still mispriced in the region.`,
    ],
  },
  {
    assetClass: "collectibles",
    body: (n) => `Paris art lending doubled in 12 months. @{${n.a}} holding advance rates under 50% LTV despite the competition — discipline worth noting.`,
    replies: [
      () => `The wrapper structures are what changed. Supervisors finally have a template they'll authorise.`,
    ],
  },
  {
    assetClass: "private-credit",
    body: (n) => `Covenant repair is real: two-thirds of new unitranche deals carry at least one maintenance covenant. @{${n.a}}'s docs are the reference set. The 2021 lesson, priced in.`,
    replies: [
      () => `Spreads 25bps tighter but EBITDA definitions shortened. Net-net documentation quality up.`,
      () => `Watch addback caps — that's where the flex went.`,
    ],
  },
];

const MENTION_POOL = MOCK_ENTITIES.filter((e) => e.role === "gp" || e.role === "servicer");

export function buildMockThreads(now: Date = new Date()): MockThread[] {
  const rand = mulberry32(777);
  const threads: MockThread[] = [];
  const COUNT = 40;
  for (let i = 0; i < COUNT; i++) {
    const template = THREAD_TEMPLATES[i % THREAD_TEMPLATES.length]!;
    // Prefer mention entities of the thread's class; fall back to the pool.
    const classPool = MENTION_POOL.filter((e) => e.assetClass === template.assetClass);
    const pool = classPool.length >= 2 ? classPool : MENTION_POOL;
    const a = pool[Math.floor(rand() * pool.length)]!;
    let b = pool[Math.floor(rand() * pool.length)]!;
    if (b.id === a.id) {
      b = pool[(pool.indexOf(a) + 1) % pool.length]!;
    }
    const rootAgeH = 2 + rand() * 24 * 20;
    const rootAt = new Date(now.getTime() - rootAgeH * 3600_000);
    const rootAuthor = MOCK_MEMBERS[Math.floor(rand() * MOCK_MEMBERS.length)]!;
    const replyDefs = template.replies.slice(0, 1 + Math.floor(rand() * template.replies.length));
    const replies: MockThreadPost[] = replyDefs.map((make, j) => {
      const author = MOCK_MEMBERS[Math.floor(rand() * MOCK_MEMBERS.length)]!;
      return {
        id: `mock-t-${i + 1}-r${j + 1}`,
        memberId: author.id,
        postedAt: new Date(rootAt.getTime() + (j + 1) * (1 + rand() * 4) * 3600_000).toISOString(),
        body: make({ a: a.name, b: b.name }),
      };
    });
    threads.push({
      id: `mock-t-${i + 1}`,
      root: {
        id: `mock-t-${i + 1}-root`,
        memberId: rootAuthor.id,
        postedAt: rootAt.toISOString(),
        body: template.body({ a: a.name, b: b.name }),
      },
      replies,
      assetClass: template.assetClass,
      validates: Math.floor(rand() * 40),
      disputes: Math.floor(rand() * 6),
      saves: Math.floor(rand() * 25),
    });
  }
  return threads.sort((x, y) => y.root.postedAt.localeCompare(x.root.postedAt));
}

/** Split a thread body into text and mention segments for rendering. */
export function splitMentions(body: string): { type: "text" | "mention"; value: string }[] {
  const parts: { type: "text" | "mention"; value: string }[] = [];
  const re = /@\{([^}]+)\}/g;
  let last = 0;
  for (let m = re.exec(body); m !== null; m = re.exec(body)) {
    if (m.index > last) {
      parts.push({ type: "text", value: body.slice(last, m.index) });
    }
    parts.push({ type: "mention", value: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    parts.push({ type: "text", value: body.slice(last) });
  }
  return parts;
}

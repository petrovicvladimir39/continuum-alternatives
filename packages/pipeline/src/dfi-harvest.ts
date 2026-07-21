import "./env";
import { EUROPE_COUNTRIES, EUROPE_COUNTRY_NAMES } from "@continuum/shared";
import {
  and,
  createEntity,
  db,
  edges,
  entities,
  entityTags,
  eq,
  inArray,
  organizations,
  resolveEntity,

} from "@continuum/db";
import { splitLine } from "./registers";

/**
 * CLEAN-100 Part 3 — DFI / promotional-bank fund-portfolio harvest. $0, no
 * LLM. Probed routes 2026-07-21 (verdicts in docs/register-catalog.md):
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/dfi-harvest.ts -- --source ebrd|ifc|kfw|cdp|fii|axis [--cap 1000]
 *
 * These are DISCLOSURE-grade lists, not registers: new fund entities land
 * status='provisional' with needs_verification (same doctrine as Wikidata),
 * matched entities only gain tags. Each fund gets a PROPOSED lp_in edge from
 * the DFI (DFI -[lp_in]-> fund) awaiting operator review.
 */

const UA = "ContinuumBot/1.0 (data platform; hello@continuumalternatives.com)";

// EBRD/IFC write country names in full; extend the platform map with the
// variants those sources use.
const COUNTRY_VARIANTS: Record<string, string> = {
  "czech republic": "CZ",
  "slovak republic": "SK",
  "republic of moldova": "MD",
  "bosnia and herzegovina": "BA",
  "north macedonia": "MK",
  turkiye: "",
  turkey: "",
};

function countryToIso(name: string | undefined): string | null {
  if (!name) {
    return null;
  }
  const wanted = name.trim().toLowerCase();
  if (wanted in COUNTRY_VARIANTS) {
    return COUNTRY_VARIANTS[wanted] === "" ? null : COUNTRY_VARIANTS[wanted]!;
  }
  for (const [code, full] of Object.entries(EUROPE_COUNTRY_NAMES)) {
    if (full.toLowerCase() === wanted) {
      return code;
    }
  }
  return null;
}

type DfiFund = {
  name: string;
  country: string | null; // null = domicile unknown (kept, entity gets no country)
  website?: string | null;
  note: string;
};

type DfiSource = {
  key: string;
  dfiName: string;
  dfiCountry: string;
  dfiWebsite: string;
  tag: string;
  fetch: (cap: number) => Promise<DfiFund[]>;
};

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, ...(init?.headers ?? {}) },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`${response.status} fetching ${url}`);
  }
  return response.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── EBRD ────────────────────────────────────────────────────────────────────

async function ebrdFunds(cap: number): Promise<DfiFund[]> {
  const csv = await fetchText("https://www.ebrd.com/content/dam/ebrd_dxp/projectsData.csv");
  const lines = csv.split(/\r?\n/);
  const header = splitLine(lines[0] ?? "", ",");
  const iCountry = header.findIndex((h) => h.toLowerCase().includes("country"));
  const iTitle = header.findIndex((h) => h.toLowerCase() === "title");
  const iSector = header.findIndex((h) => h.toLowerCase() === "sector");
  const iStatus = header.findIndex((h) => h.toLowerCase().includes("project status"));
  const iUrl = header.findIndex((h) => h.toLowerCase().includes("url"));
  if (iTitle < 0 || iSector < 0) {
    throw new Error(`EBRD csv: unexpected header ${(lines[0] ?? "").slice(0, 120)}`);
  }
  const funds: DfiFund[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length && funds.length < cap; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "") {
      continue;
    }
    const cells = splitLine(line, ",");
    if ((cells[iSector] ?? "") !== "Equity Funds") {
      continue;
    }
    const name = (cells[iTitle] ?? "").trim();
    const status = iStatus >= 0 ? (cells[iStatus] ?? "") : "";
    if (name === "" || seen.has(name.toLowerCase()) || /cancel/i.test(status)) {
      continue;
    }
    seen.add(name.toLowerCase());
    funds.push({
      name,
      country: countryToIso(cells[iCountry]),
      website: null,
      note: `EBRD equity-fund project (${status || "status n/a"}) · ${((iUrl >= 0 && cells[iUrl]) || "").trim()}`,
    });
  }
  return funds;
}

// ── IFC ─────────────────────────────────────────────────────────────────────

// European Country_Description values are matched via countryToIso; regional
// buckets ("Central Europe Subregion", …) carry no domicile — skipped.
async function ifcFunds(cap: number): Promise<DfiFund[]> {
  const home = await fetchText("https://disclosures.ifc.org/");
  const key = /data-subscription-key="([a-f0-9]{32})"/.exec(home)?.[1];
  const endpoint =
    /data-api-endpoint="([^"]+)"/.exec(home)?.[1] ??
    "https://webapi.worldbank.org/aemsite/ifc-disclosure-search";
  if (key === undefined) {
    throw new Error("IFC: subscription key not found on homepage (layout changed?)");
  }
  const funds: DfiFund[] = [];
  const seen = new Set<string>();
  for (let skip = 0; skip < 1000 && funds.length < cap; skip += 50) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "user-agent": UA,
        "content-type": "application/json",
        "Ocp-Apim-Subscription-Key": key,
      },
      body: JSON.stringify({
        search: "*",
        count: true,
        filter: "Industry_Description eq 'Funds' and Type_Description eq 'Investment'",
        skip,
        top: 50,
      }),
    });
    if (!response.ok) {
      throw new Error(`IFC search ${response.status}`);
    }
    const payload = (await response.json()) as {
      value: {
        Project_Name?: string;
        Company_Name?: string;
        Country_Description?: string;
        Status_Description?: string;
        Project_Number?: string;
      }[];
    };
    if (payload.value.length === 0) {
      break;
    }
    for (const p of payload.value) {
      const iso = countryToIso(p.Country_Description);
      const name = (p.Company_Name || p.Project_Name || "").trim();
      if (iso === null || name === "" || seen.has(name.toLowerCase())) {
        continue;
      }
      seen.add(name.toLowerCase());
      funds.push({
        name,
        country: iso,
        note: `IFC disclosure · Funds · project ${p.Project_Number ?? "n/a"} · ${p.Status_Description ?? ""}`,
      });
    }
    await sleep(800);
  }
  return funds.slice(0, cap);
}

// ── KfW Capital ─────────────────────────────────────────────────────────────

async function kfwFunds(cap: number): Promise<DfiFund[]> {
  const html = await fetchText("https://www.kfw-capital.de/Portfolio/");
  const funds: DfiFund[] = [];
  const seen = new Set<string>();
  const teaserRe = /<div class="teaser [\s\S]*?<p class="hl-4"\s*>([^<]+)<\/p>[\s\S]*?(?:href="(https?:\/\/[^"]+)"[^>]*class="link external"|class="link external"[^>]*href="(https?:\/\/[^"]+)")?/g;
  let m: RegExpExecArray | null;
  while ((m = teaserRe.exec(html)) !== null && funds.length < cap) {
    const name = m[1]!.replace(/&shy;|­/g, "").trim();
    if (name === "" || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    funds.push({
      name,
      country: null, // fund domiciles not disclosed on the page
      website: m[2] ?? m[3] ?? null,
      note: "KfW Capital portfolio fund",
    });
  }
  return funds;
}

// ── CDP Venture Capital ─────────────────────────────────────────────────────

async function cdpFunds(cap: number): Promise<DfiFund[]> {
  const html = await fetchText("https://www.cdpventurecapital.it/it/portfolio.page");
  const funds: DfiFund[] = [];
  const seen = new Set<string>();
  const cardRe = /data-category="FondiSupportati"[\s\S]*?class="h4"[^>]*>([^<]+)</g;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null && funds.length < cap) {
    const name = m[1]!.trim();
    if (name === "" || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    // CDP VC's supported funds are Italian vehicles (programme mandate).
    funds.push({ name, country: "IT", note: "CDP Venture Capital · fondo supportato" });
  }
  return funds;
}

// ── Fondo Italiano d'Investimento ───────────────────────────────────────────

async function fiiFunds(cap: number): Promise<DfiFund[]> {
  const html = await fetchText("https://www.fondoitaliano.it/en/indirect-investments/");
  const funds: DfiFund[] = [];
  const seen = new Set<string>();
  const cardRe =
    /investimento-card-small__heading[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null && funds.length < cap) {
    const name = m[2]!.trim();
    if (name === "" || seen.has(name.toLowerCase())) {
      continue;
    }
    seen.add(name.toLowerCase());
    funds.push({
      name,
      country: "IT",
      website: m[1]?.startsWith("http") ? m[1] : null,
      note: "Fondo Italiano d'Investimento · indirect investment (FoF target fund)",
    });
  }
  return funds;
}

// ── Axis / Fond-ICO Global ──────────────────────────────────────────────────

async function axisFunds(cap: number): Promise<DfiFund[]> {
  const html = await fetchText(
    "https://www.axispart.com/web/axis/ico/cartera/cartera_de_fond_ico_global",
  );
  const funds: DfiFund[] = [];
  const seen = new Set<string>();
  // One fund per table row: <td…><p><a href="{fund site}">NAME</a></p></td>.
  const rowRe = /<td[^>]*nowrap[^>]*>\s*<p><a href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null && funds.length < cap) {
    const website = m[1]!.trim();
    const name = m[2]!.replace(/\s+/g, " ").trim();
    if (name.length < 4 || seen.has(name.toLowerCase()) || /^fondo?s?$/i.test(name)) {
      continue;
    }
    seen.add(name.toLowerCase());
    // Fond-ICO Global backs Spain-focused vehicles; some are LU SICARs —
    // domicile suffixes override the ES default.
    const country = /sicar|s\.c\.a\.|luxembourg/i.test(name) ? "LU" : "ES";
    funds.push({ name, country, website, note: "Axis Fond-ICO Global portfolio fund" });
  }
  return funds;
}

const SOURCES: DfiSource[] = [
  { key: "ebrd", dfiName: "European Bank for Reconstruction and Development", dfiCountry: "GB", dfiWebsite: "https://www.ebrd.com", tag: "dfi_ebrd", fetch: ebrdFunds },
  { key: "ifc", dfiName: "International Finance Corporation", dfiCountry: "US", dfiWebsite: "https://www.ifc.org", tag: "dfi_ifc", fetch: ifcFunds },
  { key: "kfw", dfiName: "KfW Capital", dfiCountry: "DE", dfiWebsite: "https://www.kfw-capital.de", tag: "dfi_kfw", fetch: kfwFunds },
  { key: "cdp", dfiName: "CDP Venture Capital SGR", dfiCountry: "IT", dfiWebsite: "https://www.cdpventurecapital.it", tag: "dfi_cdp", fetch: cdpFunds },
  { key: "fii", dfiName: "Fondo Italiano d'Investimento SGR", dfiCountry: "IT", dfiWebsite: "https://www.fondoitaliano.it", tag: "dfi_fii", fetch: fiiFunds },
  { key: "axis", dfiName: "Axis Participaciones Empresariales", dfiCountry: "ES", dfiWebsite: "https://www.axispart.com", tag: "dfi_axis", fetch: axisFunds },
];

async function getOrCreateDfi(source: DfiSource): Promise<string> {
  const resolved = await resolveEntity({
    name: source.dfiName,
    country: source.dfiCountry,
    kindHint: "organization",
  });
  if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
    return resolved.entityId;
  }
  const entity = await createEntity({
    kind: "organization",
    name: source.dfiName,
    country: source.dfiCountry,
    tags: ["dfi"],
  });
  await db.insert(organizations).values({
    entityId: entity.id,
    website: source.dfiWebsite,
    verificationNote: "DFI anchor entity (clean-100 Part 3)",
  });
  return entity.id;
}

async function proposeLpEdges(pairs: { dfiId: string; fundId: string }[]): Promise<number> {
  if (pairs.length === 0) {
    return 0;
  }
  const dfiIds = [...new Set(pairs.map((p) => p.dfiId))];
  const existing = await db
    .select({ source: edges.sourceEntityId, target: edges.targetEntityId })
    .from(edges)
    .where(and(eq(edges.edgeType, "lp_in"), inArray(edges.sourceEntityId, dfiIds)));
  const have = new Set(existing.map((e) => `${e.source}:${e.target}`));
  const fresh = [
    ...new Map(
      pairs
        .filter((p) => !have.has(`${p.dfiId}:${p.fundId}`) && p.dfiId !== p.fundId)
        .map((p) => [`${p.dfiId}:${p.fundId}`, p]),
    ).values(),
  ];
  for (let i = 0; i < fresh.length; i += 200) {
    const chunk = fresh.slice(i, i + 200);
    await db.insert(edges).values(
      chunk.map((p) => ({
        edgeType: "lp_in" as const,
        sourceEntityId: p.dfiId,
        targetEntityId: p.fundId,
        status: "proposed" as const,
        confidence: "0.85",
      })),
    );
  }
  return fresh.length;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let sourceKey = "";
  let cap = 1000;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source" && argv[i + 1]) {
      sourceKey = argv[++i]!.toLowerCase();
    } else if (argv[i] === "--cap" && argv[i + 1]) {
      cap = Number.parseInt(argv[++i]!, 10);
    }
  }
  const source = SOURCES.find((s) => s.key === sourceKey);
  if (source === undefined || !Number.isFinite(cap) || cap <= 0) {
    console.error(
      `usage: tsx src/dfi-harvest.ts -- --source ${SOURCES.map((s) => s.key).join("|")} [--cap 1000]`,
    );
    process.exit(1);
  }

  console.log(`${source.key}: fetching portfolio (cap ${cap})…`);
  const funds = await source.fetch(cap);
  console.log(`${source.key}: ${funds.length} candidate funds`);

  const dfiId = await getOrCreateDfi(source);
  let created = 0;
  let merged = 0;
  let ambiguous = 0;
  let skipped = 0;
  const pairs: { dfiId: string; fundId: string }[] = [];

  for (const fund of funds) {
    if (fund.country !== null && !EUROPE_COUNTRIES.includes(fund.country)) {
      skipped += 1;
      continue;
    }
    const resolved = await resolveEntity({
      name: fund.name,
      ...(fund.country !== null ? { country: fund.country } : {}),
      kindHint: "organization",
    });
    if (resolved.outcome === "matched" && resolved.entityId !== undefined) {
      const entityId = resolved.entityId;
      const tagRows = await db
        .select({ tag: entityTags.tag })
        .from(entityTags)
        .where(eq(entityTags.entityId, entityId));
      if (!tagRows.some((t) => t.tag === source.tag)) {
        await db.insert(entityTags).values([{ entityId, tag: source.tag }]);
      }
      pairs.push({ dfiId, fundId: entityId });
      merged += 1;
      continue;
    }
    if (resolved.outcome === "ambiguous") {
      ambiguous += 1;
      continue;
    }
    // New — disclosure-grade rows NEVER auto-activate (Wikidata doctrine).
    const entity = await createEntity({
      kind: "organization",
      name: fund.name,
      ...(fund.country !== null ? { country: fund.country } : {}),
      tags: [source.tag, "needs_verification"],
    });
    await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, entity.id));
    await db.insert(organizations).values({
      entityId: entity.id,
      website: fund.website ?? null,
      verificationNote: `${fund.note} (clean-100 Part 3; awaiting verification)`,
    });
    pairs.push({ dfiId, fundId: entity.id });
    created += 1;
  }

  const edgeCount = await proposeLpEdges(pairs);
  console.log(
    `${source.key} report: created ${created} provisional, merged ${merged}, ambiguous ${ambiguous}, skipped ${skipped}, lp_in edges proposed ${edgeCount}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

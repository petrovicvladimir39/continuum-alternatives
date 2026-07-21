import type { RegisterRow } from "@continuum/db";

/**
 * Pure parsers for national-regulator register harvests (no I/O — fixture
 * tested in verify-gleif). Access routes documented in
 * docs/register-catalog.md; fetch orchestration lives in registers-harvest.ts.
 */

export type AdapterResult = {
  rows: RegisterRow[];
  /** Optional manages links by registryId (manager -> managed vehicle). */
  managesByRegistryId?: { managerKey: string; fundKey: string }[];
};

/** Minimal delimited-line splitter with RFC-4180 quotes. */
export function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  cells.push(field);
  return cells.map((c) => c.trim());
}

// ── CSSF (LU) ───────────────────────────────────────────────────────────────

/**
 * Parse the CSSF IDENTIFIANTS_AIFM bulk file (UTF-16LE, tab-delimited,
 * space-padded; row 2 is a dashes separator). Columns: flag, AIFM id,
 * AIFM_NAME, STATUS(REG|AUT), flag, AIF id, AIF_NAME, subfund code,
 * subfund name, start date [, end date]. One row per AIFM×AIF×subfund —
 * dedupe to unique AIFMs (managers) and AIFs (vehicles), keep manages links.
 */
export function parseCssfAifm(text: string, cap: number): AdapterResult {
  const lines = text.split(/\r?\n/);
  const rows: RegisterRow[] = [];
  const manages: { managerKey: string; fundKey: string }[] = [];
  const seenManagers = new Set<string>();
  const seenFunds = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "" || line.startsWith("-")) {
      continue;
    }
    const cells = line.split("\t").map((c) => c.trim());
    const aifmId = cells[1] ?? "";
    const aifmName = cells[2] ?? "";
    const status = cells[3] ?? "";
    const aifId = cells[5] ?? "";
    const aifName = cells[6] ?? "";
    if (!/^\d+$/.test(aifmId) || aifmName === "") {
      continue;
    }
    const managerKey = `CSSF:A${aifmId}`;
    if (!seenManagers.has(managerKey)) {
      if (rows.length >= cap) {
        break;
      }
      seenManagers.add(managerKey);
      rows.push({
        name: aifmName,
        country: "LU",
        registryId: managerKey,
        tags: ["register_verified", "cssf"],
        note: `CSSF AIFM ${aifmId} · status ${status}`,
      });
    }
    if (/^\d+$/.test(aifId) && aifName !== "") {
      const fundKey = `CSSF:F${aifId}`;
      if (!seenFunds.has(fundKey) && rows.length < cap) {
        seenFunds.add(fundKey);
        rows.push({
          name: aifName,
          country: "LU",
          registryId: fundKey,
          tags: ["register_verified", "cssf"],
          note: `CSSF AIF ${aifId} · managed by AIFM ${aifmId}`,
        });
      }
      if (seenFunds.has(fundKey)) {
        manages.push({ managerKey, fundKey });
      }
    }
  }
  return { rows, managesByRegistryId: manages };
}

// ── NBS (SK) ────────────────────────────────────────────────────────────────

/** License scopes relevant to the alternative-assets universe (priority order). */
const NBS_SCOPES: { match: string; priority: number }[] = [
  { match: "správcovská spoločnosť", priority: 1 }, // asset management company
  { match: "kolektívneho investovania", priority: 1 }, // collective investment
  { match: "obchodník s cennými papiermi", priority: 2 }, // investment firm
  { match: "dôchodková správcovská", priority: 3 }, // pension mgmt
  { match: "doplnková dôchodková", priority: 3 },
  { match: "banka", priority: 4 },
  { match: "poisťovňa", priority: 5 }, // insurer
];

export type NbsInstitution = {
  id?: string;
  name?: string;
  address?: string;
  country?: string;
  licenses?: { scope?: string }[];
};

export function nbsCityFromAddress(address: string | undefined): string | null {
  if (address === undefined || address === "") {
    return null;
  }
  const last = address.split(",").pop()?.trim() ?? "";
  const city = last.replace(/^\d{3}\s?\d{2}\s*/, "").trim();
  return city === "" ? null : city;
}

export function nbsSelectRows(institutions: NbsInstitution[], cap: number): RegisterRow[] {
  const scored: { row: RegisterRow; priority: number }[] = [];
  for (const inst of institutions) {
    if (inst.country !== "SK" || !inst.name || !inst.id) {
      continue;
    }
    const scopes = (inst.licenses ?? []).map((l) => l.scope?.toLowerCase() ?? "").filter(Boolean);
    // Exclude the huge financial-agent population; keep licensed institutions.
    if (scopes.length === 0 || scopes.every((s) => s.includes("agent"))) {
      continue;
    }
    let best: number | null = null;
    let bestScope = "";
    for (const scope of scopes) {
      for (const rule of NBS_SCOPES) {
        if (scope.includes(rule.match) && (best === null || rule.priority < best)) {
          best = rule.priority;
          bestScope = scope;
        }
      }
    }
    if (best === null) {
      continue;
    }
    scored.push({
      priority: best,
      row: {
        name: inst.name,
        country: "SK",
        city: nbsCityFromAddress(inst.address),
        registryId: `NBS:${inst.id}`,
        tags: ["register_verified", "nbs"],
        note: `NBS register · IČO ${inst.id} · ${bestScope}`,
      },
    });
  }
  scored.sort((a, b) => a.priority - b.priority);
  return scored.slice(0, cap).map((s) => s.row);
}

// ── AMF (FR) ────────────────────────────────────────────────────────────────

/**
 * Parse the AMF "sociétés de gestion de portefeuille" open-data CSV
 * (semicolon-delimited, BOM, one row per firm×activity — dedupe by no_amf,
 * keep statut Vivant). LEI, when present, is the deterministic key.
 */
export function parseAmfCsv(text: string, cap: number): RegisterRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const headerLine = lines[0] ?? "";
  const header = splitLine(headerLine, ";");
  const idx = (name: string) => header.indexOf(name);
  const iNo = idx("no_amf");
  const iName = idx("entite_nom");
  const iCountry = idx("pays_siege");
  const iSite = idx("site_internet");
  const iLei = idx("lei");
  const iStatut = idx("statut");
  if (iNo < 0 || iName < 0) {
    throw new Error(`AMF csv: unexpected header ${headerLine.slice(0, 120)}`);
  }
  const rows: RegisterRow[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length && rows.length < cap; i++) {
    const line = lines[i];
    if (line === undefined || line === "") {
      continue;
    }
    const cells = splitLine(line, ";");
    const no = cells[iNo] ?? "";
    const name = cells[iName] ?? "";
    if (no === "" || name === "" || seen.has(no)) {
      continue;
    }
    if (iStatut >= 0 && cells[iStatut] !== "" && cells[iStatut] !== "Vivant") {
      continue;
    }
    seen.add(no);
    const lei = (iLei >= 0 ? (cells[iLei] ?? "") : "").trim();
    const website = (iSite >= 0 ? (cells[iSite] ?? "") : "").trim();
    rows.push({
      name,
      country: (iCountry >= 0 && cells[iCountry] !== "" ? cells[iCountry]! : "FR").toUpperCase(),
      website: website !== "" ? (website.startsWith("http") ? website : `https://${website}`) : null,
      registryId: lei !== "" ? lei : `AMF:${no}`,
      tags: lei !== "" ? ["register_verified", "amf", "lei"] : ["register_verified", "amf"],
      note: `AMF SGP ${no}${lei !== "" ? ` · LEI ${lei}` : ""}`,
    });
  }
  return rows;
}

// ── Bank of Lithuania (LT) ──────────────────────────────────────────────────

/** Participant types relevant to the alternative-assets universe. */
const LB_TYPE_MATCH = [
  "management company",
  "collective investment",
  "investment fund",
  "financial brokerage",
  "investment management",
  "bank",
  "pension",
  "crowdfunding",
];

export function parseLbCsv(text: string): RegisterRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const header = splitLine(lines[0] ?? "", ";");
  const iTitle = header.indexOf("Title");
  // Column sets differ per market: some exports carry Type + Business form
  // + Company code, others only Title + Segment. Locate what exists.
  const iType = header.indexOf("Type") >= 0 ? header.indexOf("Type") : header.indexOf("Segment");
  const iForm = header.indexOf("Business form");
  const iCode = header.indexOf("Company code");
  if (iTitle < 0 || iType < 0) {
    throw new Error(`LB csv: unexpected header ${(lines[0] ?? "").slice(0, 120)}`);
  }
  const rows: RegisterRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line === "") {
      continue;
    }
    const cells = splitLine(line, ";");
    const name = cells[iTitle] ?? "";
    const type = (cells[iType] ?? "").toLowerCase();
    const form = ((iForm >= 0 ? cells[iForm] : "") ?? "").toLowerCase();
    const code = ((iCode >= 0 ? cells[iCode] : "") ?? "").trim();
    if (name === "" || !LB_TYPE_MATCH.some((m) => type.includes(m))) {
      continue;
    }
    // Skip EEA passporting entries — not Lithuania-domiciled entities.
    if (
      form.includes("other eu") ||
      form.includes("other eea") ||
      form.includes("without a branch")
    ) {
      continue;
    }
    rows.push({
      name,
      country: "LT",
      registryId: code !== "" && code !== "N/A" ? `LB:${code}` : null,
      tags: ["register_verified", "lb_lt"],
      note: `Bank of Lithuania register · ${cells[iType] ?? ""}${code !== "" ? ` · code ${code}` : ""}`,
    });
  }
  return rows;
}

// ── Minimal XLSX (clean-100 Part 2) ─────────────────────────────────────────

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

/**
 * Parse a worksheet XML (inline-string or shared-string cells) into rows of
 * { colLetter: text }. sharedStrings may be empty for inline-string files
 * (FINMA exports use t="inlineStr" throughout).
 */
export function parseXlsxSheet(
  sheetXml: string,
  sharedStrings: string[] = [],
): Map<number, Record<string, string>> {
  const rows = new Map<number, Record<string, string>>();
  const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(sheetXml)) !== null) {
    const attrs = m[1] ?? "";
    const inner = m[2] ?? "";
    const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
    if (ref === null) {
      continue;
    }
    const col = ref[1]!;
    const rowNum = Number(ref[2]);
    const type = /t="(\w+)"/.exec(attrs)?.[1] ?? "";
    let text = "";
    if (type === "inlineStr") {
      const t = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
      text = t?.[1] ?? "";
    } else {
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
      const rawValue = v?.[1] ?? "";
      text = type === "s" ? (sharedStrings[Number(rawValue)] ?? "") : rawValue;
    }
    text = decodeXmlEntities(text).trim();
    if (text === "") {
      continue;
    }
    const row = rows.get(rowNum) ?? {};
    row[col] = text;
    rows.set(rowNum, row);
  }
  return rows;
}

/** Extract si texts from xl/sharedStrings.xml (concatenating rich-text runs). */
export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml)) !== null) {
    const texts = [...(m[1] ?? "").matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) =>
      decodeXmlEntities(t[1] ?? ""),
    );
    out.push(texts.join(""));
  }
  return out;
}

// ── FINMA (CH) ──────────────────────────────────────────────────────────────

/**
 * FINMA authorisation-holder XLSX lists (flvervt: Fondsleitungen / Verwalter
 * von Kollektivvermögen / Vertreter; afch: Swiss collective investment
 * schemes). Generic recipe: header row = first row containing a "Name" cell;
 * "Ort" column when present is the city; other header cells marked "X" in a
 * data row describe the role (kept in the note).
 */
export function finmaSelectRows(
  sheetRows: Map<number, Record<string, string>>,
  listName: string,
  cap: number,
): RegisterRow[] {
  let headerRow = -1;
  let nameCol = "";
  let ortCol = "";
  const roleCols: { col: string; label: string }[] = [];
  const sorted = [...sheetRows.entries()].sort((a, b) => a[0] - b[0]);
  for (const [rowNum, cells] of sorted) {
    const nameEntry = Object.entries(cells).find(([, v]) => v === "Name");
    if (nameEntry !== undefined) {
      headerRow = rowNum;
      nameCol = nameEntry[0];
      for (const [col, value] of Object.entries(cells)) {
        if (value === "Ort") {
          ortCol = col;
        } else if (col !== nameCol && value.length > 1) {
          roleCols.push({ col, label: value });
        }
      }
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error(`FINMA ${listName}: no header row with "Name" found`);
  }
  const rows: RegisterRow[] = [];
  for (const [rowNum, cells] of sorted) {
    if (rowNum <= headerRow || rows.length >= cap) {
      continue;
    }
    const name = cells[nameCol] ?? "";
    if (name === "" || name.length < 3) {
      continue;
    }
    const roles = roleCols
      .filter(({ col }) => (cells[col] ?? "").toUpperCase() === "X")
      .map(({ label }) => label);
    rows.push({
      name,
      country: "CH",
      city: ortCol !== "" ? cells[ortCol] || null : null,
      registryId: null,
      tags: ["register_verified", "finma"],
      note: `FINMA ${listName}${roles.length > 0 ? ` · ${roles.join(", ")}` : ""}`,
    });
  }
  return rows;
}

// ── ESMA central registers (EU-wide rescue) ─────────────────────────────────

/** ESMA upreg entity doc (parent type "ae") — AIFMs, UCITS ManCos, EuVECA/EuSEF. */
export type EsmaEntityDoc = {
  ae_entityName?: string;
  ae_entityTypeCode?: string;
  ae_entityTypeLabel?: string;
  ae_lei?: string;
  ae_homeMemberState?: string;
  ae_headOfficeAddress?: string;
  ae_competentAuthority?: string;
  ae_website?: string;
  ae_status?: string;
  ae_dbId?: number;
};

/** lowercase full country name -> ISO2, built from EUROPE_COUNTRY_NAMES. */
export function esmaCountryCode(
  memberState: string | undefined,
  namesByCode: Record<string, string>,
): string | null {
  if (!memberState) {
    return null;
  }
  const wanted = memberState.trim().toLowerCase();
  for (const [code, name] of Object.entries(namesByCode)) {
    if (name.toLowerCase() === wanted) {
      return code;
    }
  }
  return null;
}

export function esmaDocsToRows(
  docs: EsmaEntityDoc[],
  namesByCode: Record<string, string>,
  cap: number,
): RegisterRow[] {
  const rows: RegisterRow[] = [];
  for (const doc of docs) {
    if (rows.length >= cap) {
      break;
    }
    const name = doc.ae_entityName?.trim() ?? "";
    const country = esmaCountryCode(doc.ae_homeMemberState, namesByCode);
    if (name === "" || country === null || doc.ae_status !== "Active") {
      continue;
    }
    const lei = doc.ae_lei?.trim() ?? "";
    const label = doc.ae_entityTypeLabel ?? doc.ae_entityTypeCode ?? "entity";
    rows.push({
      name,
      country,
      website: doc.ae_website?.trim() || null,
      registryId: lei !== "" ? lei : doc.ae_dbId !== undefined ? `ESMA:${doc.ae_dbId}` : null,
      tags: ["register_verified", "esma"],
      note: `ESMA register · ${label} · ${doc.ae_competentAuthority ?? ""}`.trim(),
    });
  }
  return rows;
}

// ── HANFA (HR) ──────────────────────────────────────────────────────────────

/** Parse a HANFA register ?export=xml payload (Row elements, Croatian tags). */
export function parseHanfaXml(xml: string, registerLabel: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  const rowRe = /<Row>([\s\S]*?)<\/Row>/g;
  const tag = (block: string, name: string): string => {
    const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
    return decodeXmlEntities(m?.[1] ?? "").trim();
  };
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const name = tag(block, "Naziv");
    if (name === "") {
      continue;
    }
    const active = tag(block, "Aktivnost");
    if (active !== "" && active !== "true") {
      continue;
    }
    const lei = tag(block, "LEI");
    const oib = tag(block, "OIB");
    const address = tag(block, "Sjediste");
    const website = tag(block, "WWW");
    const city = address.split(",").pop()?.trim() || null;
    rows.push({
      name,
      country: "HR",
      city,
      website: website !== "" ? (website.startsWith("http") ? website : `https://${website}`) : null,
      registryId: lei !== "" ? lei : oib !== "" ? `HR-OIB:${oib}` : null,
      tags: ["register_verified", "hanfa"],
      note: `HANFA register · ${registerLabel}${oib !== "" ? ` · OIB ${oib}` : ""}`,
    });
  }
  return rows;
}

// ── AFM (NL) ────────────────────────────────────────────────────────────────

/**
 * AFM register CSV exports (export.aspx, semicolon-delimited, quoted):
 * "Statutaire naam";"Handelsnaam";"Plaats";"Land". Dutch-domiciled rows only —
 * EEA passporting entries are covered by their home registers.
 */
export function parseAfmCsv(text: string, label: string, cap: number): RegisterRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const rows: RegisterRow[] = [];
  for (let i = 1; i < lines.length && rows.length < cap; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "") {
      continue;
    }
    const cells = splitLine(line, ";");
    const name = cells[0] ?? "";
    const city = cells[2] ?? "";
    const land = (cells[3] ?? "").toLowerCase();
    if (name === "" || (land !== "" && land !== "nederland")) {
      continue;
    }
    rows.push({
      name,
      country: "NL",
      city: city || null,
      registryId: null,
      tags: ["register_verified", "afm"],
      note: `AFM register · ${label}`,
    });
  }
  return rows;
}

/**
 * AFM AIFM XLSX (register-aifm / register-aifmd-light): header row carries
 * "Naam Beheerder"; one row per manager×fund. Column A = AFM manager id,
 * E = fund name, F = AFM fund id. Yields managers + funds + manages links.
 */
export function afmAifmSelectRows(
  sheetRows: Map<number, Record<string, string>>,
  label: string,
  cap: number,
): AdapterResult {
  const sorted = [...sheetRows.entries()].sort((a, b) => a[0] - b[0]);
  let headerRow = -1;
  let managerCol = "";
  const managerIdCol = "A";
  let fundCol = "";
  let fundIdCol = "";
  // Header labels differ between the licensed file (Dutch) and the light-
  // regime file (English row below a Dutch one) — accept either.
  const MANAGER_HEADERS = ["Naam Beheerder", "Name of management company"];
  const FUND_HEADERS = ["Naam Beleggingsinstelling", "Name of collective investment scheme"];
  const FUND_ID_HEADERS = ["AFM Fonds ID", "Fund ID"];
  for (const [rowNum, cells] of sorted) {
    const managerEntry = Object.entries(cells).find(([, v]) => MANAGER_HEADERS.includes(v));
    if (managerEntry !== undefined) {
      headerRow = rowNum;
      managerCol = managerEntry[0];
      for (const [col, value] of Object.entries(cells)) {
        if (FUND_HEADERS.includes(value)) {
          fundCol = col;
        } else if (FUND_ID_HEADERS.includes(value)) {
          fundIdCol = col;
        }
      }
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error(`AFM ${label}: no manager-name header found`);
  }
  const rows: RegisterRow[] = [];
  const manages: { managerKey: string; fundKey: string }[] = [];
  const seenFunds = new Set<string>();
  // Manager cells are merged in the export: A (AFM id) appears only on a
  // manager's first row, C (name) on the first row of each manager block.
  // Track the current manager; key on the AFM id when present, else a
  // deterministic name-derived key.
  let managerKey = "";
  for (const [rowNum, cells] of sorted) {
    if (rowNum <= headerRow || rows.length >= cap) {
      continue;
    }
    const manager = cells[managerCol] ?? "";
    const managerId = cells[managerIdCol] ?? "";
    if (manager !== "") {
      managerKey = /^\d+$/.test(managerId)
        ? `AFM-NL:${managerId}`
        : `AFM-NL-MGR:${manager.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      rows.push({
        name: manager,
        country: "NL",
        registryId: managerKey,
        tags: ["register_verified", "afm"],
        note: `AFM register · ${label}`,
      });
    }
    if (managerKey === "") {
      continue;
    }
    const fund = fundCol !== "" ? (cells[fundCol] ?? "") : "";
    const fundId = fundIdCol !== "" ? (cells[fundIdCol] ?? "") : "";
    if (fund !== "" && fund.toLowerCase() !== "n.v.t." && /^\d+$/.test(fundId)) {
      const fundKey = `AFM-NL-FONDS:${fundId}`;
      if (!seenFunds.has(fundKey) && rows.length < cap) {
        seenFunds.add(fundKey);
        rows.push({
          name: fund,
          country: "NL",
          registryId: fundKey,
          tags: ["register_verified", "afm"],
          note: `AFM register · ${label} · fonds ${fundId}`,
        });
      }
      manages.push({ managerKey, fundKey });
    }
  }
  return { rows, managesByRegistryId: manages };
}

// ── KNF (PL) ────────────────────────────────────────────────────────────────

/**
 * KNF TFI_i_FI page: server-rendered sections per TFI —
 * <a name=NNN></a><h4>TFI NAME</h4> … postal "12-345 City" … website anchor …
 * "Identyfikator krajowy: PLTFI000036" … fund table rows
 * <tr><td>FUND</td>\n<td class='centered'>PLFIZ000030</td>. Yields TFIs +
 * funds + manages links, all keyed on the national identifiers. Subfund rows
 * (padding-left cells under "Wydzielone subfundusze") are deliberately
 * skipped — share-class granularity, same doctrine as the CSSF harvest.
 */
export function parseKnfTfi(html: string, cap: number): AdapterResult {
  const rows: RegisterRow[] = [];
  const manages: { managerKey: string; fundKey: string }[] = [];
  const sections = html.split(/<a name=\d+><\/a>/).slice(1);
  for (const section of sections) {
    if (rows.length >= cap) {
      break;
    }
    const nameMatch = /^<h4>([^<]+)<\/h4>/.exec(section);
    const tfiId = /Identyfikator krajowy: (PLTFI\d+)/.exec(section)?.[1];
    if (nameMatch === null || tfiId === undefined) {
      continue;
    }
    const city = /\d{2}-\d{3}\s+([^<]+)<br/.exec(section)?.[1]?.trim() ?? null;
    const website = /<a href='(https?:\/\/[^']+)' target='_blank'>/.exec(section)?.[1] ?? null;
    const managerKey = `KNF:${tfiId}`;
    rows.push({
      name: nameMatch[1]!.trim(),
      country: "PL",
      city,
      website,
      registryId: managerKey,
      tags: ["register_verified", "knf"],
      note: `KNF register · TFI · ${tfiId}`,
    });
    const fundRe = /<tr><td>([\s\S]*?)<\/td>\s*<td class='centered'>(PL[A-Z]{2,5}\d+)</g;
    let f: RegExpExecArray | null;
    while ((f = fundRe.exec(section)) !== null) {
      if (rows.length >= cap) {
        break;
      }
      const fundName = f[1]!.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const fundId = f[2]!;
      const fundKey = `KNF:${fundId}`;
      rows.push({
        name: fundName,
        country: "PL",
        registryId: fundKey,
        tags: ["register_verified", "knf"],
        note: `KNF register · fundusz · ${fundId}`,
      });
      manages.push({ managerKey, fundKey });
    }
  }
  return { rows, managesByRegistryId: manages };
}

// ── CNMV (ES) ───────────────────────────────────────────────────────────────

/**
 * CNMV ListadoEntidad.aspx pages (plain GET): repeater anchors carrying
 * href="…?nif=X" and a span.tit-small with the entity name.
 */
export function parseCnmvList(html: string, label: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  const re = /href="[^"]*\?nif=([A-Z0-9]+)"[^>]*>\s*<span[^>]*class="[^"]*tit-small[^"]*"[^>]*>([^<]+)<\/span>/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    const nif = m[1]!;
    const name = decodeXmlEntities(m[2]!).trim();
    if (name === "" || seen.has(nif)) {
      continue;
    }
    seen.add(nif);
    rows.push({
      name,
      country: "ES",
      registryId: `CNMV-NIF:${nif}`,
      tags: ["register_verified", "cnmv"],
      note: `CNMV register · ${label} · NIF ${nif}`,
    });
  }
  return rows;
}

// ── Finansinspektionen (SE) ─────────────────────────────────────────────────

/**
 * fi.se company register, GET with huvudkategori filter, server-rendered
 * table rows: <a href="details?id=N">Name</a></td><td>556759-2380</td>.
 */
export function parseFiSeList(html: string, label: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  const re = /<a href="details\?id=(\d+)"[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td[^>]*>\s*(\d{6}-\d{4}|[\d-]*)/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    const name = decodeXmlEntities(m[2]!).trim();
    const orgnr = (m[3] ?? "").trim();
    const key = orgnr !== "" ? `SE-ORG:${orgnr}` : `SE-FI:${m[1]}`;
    if (name === "" || seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      name,
      country: "SE",
      registryId: key,
      tags: ["register_verified", "fi_se"],
      note: `Finansinspektionen register · ${label}${orgnr !== "" ? ` · org ${orgnr}` : ""}`,
    });
  }
  return rows;
}

// ── Latvijas Banka (LV) ─────────────────────────────────────────────────────

/**
 * bank.lv Joomla com_market JSON: results field is an HTML fragment with
 * <h2 class="h-2xl">NAME</h2> … Reg. Nr. NNNN blocks per participant.
 */
export function parseLvResults(fragmentHtml: string, label: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  const blockRe = /<h2 class="h-2xl">([^<]+)<\/h2>([\s\S]*?)(?=<h2 class="h-2xl">|$)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(fragmentHtml)) !== null) {
    const name = decodeXmlEntities(m[1]!).trim();
    const regNr = /Reg\.\s*Nr\.\s*(\d+)/.exec(m[2] ?? "")?.[1];
    if (name === "") {
      continue;
    }
    rows.push({
      name,
      country: "LV",
      registryId: regNr !== undefined ? `LV-REG:${regNr}` : null,
      tags: ["register_verified", "latvijas_banka"],
      note: `Latvijas Banka register · ${label}${regNr !== undefined ? ` · reg ${regNr}` : ""}`,
    });
  }
  return rows;
}

// ── Finantsinspektsioon (EE) ────────────────────────────────────────────────

/**
 * fi.ee Drupal views list pages: rows are
 * <span class="field-content"><a href="/en/…/slug">NAME</a>. Cross-border
 * providers are skipped via the link-path filter passed by the adapter.
 */
export function parseFiEeList(
  html: string,
  pathInclude: string,
  label: string,
): RegisterRow[] {
  const rows: RegisterRow[] = [];
  const re = /<span class="field-content"><a href="(\/en\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    const href = m[1]!;
    const name = decodeXmlEntities(m[2]!).trim();
    if (name === "" || !href.includes(pathInclude) || seen.has(name)) {
      continue;
    }
    seen.add(name);
    rows.push({
      name,
      country: "EE",
      registryId: null,
      tags: ["register_verified", "fi_ee"],
      note: `Finantsinspektsioon register · ${label}`,
    });
  }
  return rows;
}

// ── ASF (RO) ────────────────────────────────────────────────────────────────

/**
 * data.asfromania.ro lista.php sections (lng=1 required): rows carry the
 * register number in a detalii.php anchor and the entity name in the fourth
 * styled cell of the same row.
 */
export function parseAsfList(html: string, label: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  const seen = new Set<string>();
  // Row shape: anchor cell (register no) · date cell · category cell · name
  // cell · … — all values in <span class='style9'>. Split per <tr>, take the
  // register number from the detalii anchor and the 4th styled span as name.
  for (const chunk of html.replace(/\r?\n/g, " ").split(/<tr/i).slice(1)) {
    const regNo = /detalii\.php\?id=\d+&nrcnvm=([^&']+)&lng=1/.exec(chunk)?.[1]?.trim();
    if (regNo === undefined || seen.has(regNo)) {
      continue;
    }
    const spans = [...chunk.matchAll(/<span class='style9'>([^<]*)<\/span>/g)].map((s) =>
      decodeXmlEntities(s[1] ?? "").trim(),
    );
    // Cells run: row no · register no · date · category code · NAME · …
    const name = spans[spans.indexOf(regNo) + 3] ?? "";
    if (name === "") {
      continue;
    }
    seen.add(regNo);
    rows.push({
      name,
      country: "RO",
      registryId: `ASF-RO:${regNo}`,
      tags: ["register_verified", "asf_ro"],
      note: `ASF register · ${label} · ${regNo}`,
    });
  }
  return rows;
}

// ── FIN-FSA (FI) ────────────────────────────────────────────────────────────

export type FinFsaEntity = {
  companyName?: string;
  businessIdentityCode?: string;
  homeState?: string;
  groups?: { groupName?: string }[];
};

/** groupName substrings that select the alternative-assets universe. */
const FINFSA_GROUPS = [
  "vaihtoehtorahastojen hoitajat", // AIFMs (licensed + registered)
  "Rahastoyhtiöt", // fund management companies
  "Sijoituspalveluyritykset", // investment firms
  "EuVECA", // registered EuVECA managers
];

export function finFsaSelectRows(entities: FinFsaEntity[], cap: number): RegisterRow[] {
  const rows: RegisterRow[] = [];
  for (const e of entities) {
    if (rows.length >= cap) {
      break;
    }
    const name = e.companyName?.trim() ?? "";
    const groups = (e.groups ?? []).map((g) => g.groupName ?? "");
    if (name === "" || groups.some((g) => g.includes("poistetut"))) {
      continue; // deregistered
    }
    const matched = groups.find((g) => FINFSA_GROUPS.some((want) => g.includes(want)));
    if (matched === undefined) {
      continue;
    }
    const bid = e.businessIdentityCode?.trim() || null;
    rows.push({
      name,
      country: "FI",
      registryId: bid !== null ? `FI-BID:${bid}` : null,
      tags: ["register_verified", "fin_fsa"],
      note: `FIN-FSA register · ${matched}${bid !== null ? ` · ${bid}` : ""}`,
    });
  }
  return rows;
}

// ── Finanstilsynet (NO) ─────────────────────────────────────────────────────

export type NoLegalEntity = {
  legalEntityId?: number;
  organisationNumber?: string | null;
  leiCode?: string | null;
  name?: string;
};

/**
 * Norwegian registry API rows for one licence type. Foreign passporting
 * entities (no Norwegian organisation number) are skipped — they are covered
 * by their home registers.
 */
export function noEntitiesToRows(
  entities: NoLegalEntity[],
  licenceLabel: string,
): RegisterRow[] {
  const rows: RegisterRow[] = [];
  for (const e of entities) {
    const name = e.name?.trim() ?? "";
    if (name === "") {
      continue;
    }
    const orgNr = e.organisationNumber?.trim() || null;
    const lei = e.leiCode?.trim() || null;
    if (orgNr === null) {
      continue;
    }
    rows.push({
      name,
      country: "NO",
      registryId: lei ?? `NO-ORG:${orgNr}`,
      tags: ["register_verified", "fintilsynet_no"],
      note: `Finanstilsynet registry · ${licenceLabel} · org ${orgNr}`,
    });
  }
  return rows;
}

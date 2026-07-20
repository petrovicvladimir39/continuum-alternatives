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

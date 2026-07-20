import { inflateRawSync } from "node:zlib";
import type { RegisterRow } from "@continuum/db";

/**
 * GLEIF LEI harvest — pure helpers (no I/O, fixture-tested in verify-gleif).
 *
 * Access route (probed 2026-07-20, reset build Part 2a):
 * - Level 1 entities: public JSON:API at api.gleif.org/api/v1/lei-records —
 *   no auth, filterable by legal-address country + entity category + status,
 *   200 records/page. The golden-copy LEI full file (~2.9M records, hundreds
 *   of MB) is overkill for capped country harvests; the API is the practical
 *   route.
 * - Level 2 fund→manager: the relationship golden-copy (RR) full file is a
 *   ~23 MB zip (480k relationship records) — ONE download replaces a
 *   per-fund relationship API call, so it is the practical route for edges.
 */

export const GLEIF_API = "https://api.gleif.org/api/v1";
export const GLEIF_RR_LATEST = "https://goldencopy.gleif.org/api/v2/golden-copies/publishes/rr/latest";
export const RR_FUND_MANAGED_BY = "IS_FUND-MANAGED_BY";

export type GleifApiRecord = {
  id: string;
  attributes: {
    lei: string;
    entity: {
      legalName?: { name?: string | null } | null;
      legalAddress?: { city?: string | null; country?: string | null } | null;
      category?: string | null;
      legalForm?: { id?: string | null } | null;
      status?: string | null;
    };
    registration?: { status?: string | null } | null;
  };
};

/**
 * Map one GLEIF API record to a register import row, or null when the record
 * is out of scope. Category filter: harvest passes requireCategory="FUND" for
 * the fund sweep; the manager ingestion path passes no requirement (managers
 * are financial entities by role, usually category GENERAL).
 */
export function gleifRecordToRow(
  record: GleifApiRecord,
  opts: { requireCategory?: string; noteSuffix?: string } = {},
): RegisterRow | null {
  const entity = record.attributes.entity;
  const lei = record.attributes.lei ?? record.id;
  const name = entity.legalName?.name?.trim() ?? "";
  const country = entity.legalAddress?.country?.trim().toUpperCase() ?? "";
  const category = entity.category ?? "";
  if (name === "" || country === "" || lei === undefined || lei === "") {
    return null;
  }
  if (entity.status !== "ACTIVE") {
    return null;
  }
  if (opts.requireCategory !== undefined && category !== opts.requireCategory) {
    return null;
  }
  return {
    name,
    country,
    city: entity.legalAddress?.city?.trim() || null,
    registryId: lei,
    tags: ["register_verified", "lei"],
    note: `GLEIF ${category || "?"} · LEI ${lei}${opts.noteSuffix ? ` · ${opts.noteSuffix}` : ""}`,
  };
}

/**
 * Minimal ZIP extraction (deflate/stored, single-volume, non-zip64) — enough
 * for GLEIF golden-copy archives without adding a dependency. Returns the
 * first entry whose name ends with `extension`.
 */
export function unzipFirstMatch(buf: Buffer, extension: string): { name: string; data: Buffer } {
  let eocd = -1;
  const scanFloor = Math.max(0, buf.length - 22 - 65536);
  for (let i = buf.length - 22; i >= scanFloor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error("unzip: end-of-central-directory not found (not a zip?)");
  }
  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("unzip: bad central directory entry");
    }
    const method = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
    if (name.toLowerCase().endsWith(extension.toLowerCase())) {
      const localNameLen = buf.readUInt16LE(localOffset + 26);
      const localExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const raw = buf.subarray(start, start + compSize);
      if (method === 8) {
        return { name, data: inflateRawSync(raw) };
      }
      if (method === 0) {
        return { name, data: Buffer.from(raw) };
      }
      throw new Error(`unzip: unsupported compression method ${method}`);
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`unzip: no "${extension}" entry found`);
}

function splitCsvLine(line: string): string[] {
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
    } else if (ch === ",") {
      cells.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  cells.push(field);
  return cells;
}

export type FundManagerPair = { fundLei: string; managerLei: string };

/**
 * Parse the RR golden-copy CSV into ACTIVE fund→manager pairs.
 * RR-CDF rows read: StartNode (the fund) IS_FUND-MANAGED_BY EndNode (the
 * manager). Header column names are located dynamically so minor CDF
 * version shifts don't break the parse.
 */
export function parseRrCsv(text: string): FundManagerPair[] {
  const lines = text.split(/\r?\n/);
  const headerLine = lines[0];
  if (headerLine === undefined || headerLine === "") {
    return [];
  }
  const header = splitCsvLine(headerLine).map((h) => h.trim());
  const col = (suffix: string) => header.findIndex((h) => h.endsWith(suffix));
  const startIdx = col("Relationship.StartNode.NodeID");
  const endIdx = col("Relationship.EndNode.NodeID");
  const typeIdx = col("Relationship.RelationshipType");
  const statusIdx = col("Relationship.RelationshipStatus");
  if (startIdx < 0 || endIdx < 0 || typeIdx < 0) {
    throw new Error(`RR csv: expected columns not found in header: ${header.slice(0, 8).join(",")}…`);
  }
  const pairs: FundManagerPair[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line === "") {
      continue;
    }
    const cells = splitCsvLine(line);
    if (cells[typeIdx] !== RR_FUND_MANAGED_BY) {
      continue;
    }
    if (statusIdx >= 0 && cells[statusIdx] !== "ACTIVE") {
      continue;
    }
    const fundLei = cells[startIdx]?.trim() ?? "";
    const managerLei = cells[endIdx]?.trim() ?? "";
    if (fundLei !== "" && managerLei !== "") {
      pairs.push({ fundLei, managerLei });
    }
  }
  return pairs;
}

/** Even split of a total cap across countries, remainder to the front. */
export function splitCap(cap: number, countries: string[]): Map<string, number> {
  const quotas = new Map<string, number>();
  if (countries.length === 0) {
    return quotas;
  }
  const base = Math.floor(cap / countries.length);
  let remainder = cap - base * countries.length;
  for (const country of countries) {
    quotas.set(country, base + (remainder > 0 ? 1 : 0));
    remainder -= 1;
  }
  return quotas;
}

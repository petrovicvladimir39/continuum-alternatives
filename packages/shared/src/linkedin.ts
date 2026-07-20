/**
 * LinkedIn Connections.csv parser (Phase 32A) — PURE, fixture-tested.
 * Input is the member's OWN LinkedIn data export, uploaded with explicit
 * consent. No API, no scraping — a file the member downloaded themselves.
 *
 * PRIVACY: the export carries an "Email Address" column. It is DROPPED
 * here, at parse time — email/phone never leave this function, and the
 * storage table has no columns for them.
 */

/** Minimal quoted-CSV reader (shared by events import + LinkedIn parse). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/\r\n/g, "\n").replace(/^﻿/, "");
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }
  return rows;
}

export type ParsedConnection = {
  /** "First Last" — display only; never resolved to person entities. */
  display: string;
  company: string | null;
  position: string | null;
  /** ISO date or null. */
  connectedOn: string | null;
};

export type ConnectionsParseResult = {
  connections: ParsedConnection[];
  /** Rows without a usable name. */
  skipped: number;
  /** True when the export carried an email column — which was DROPPED. */
  emailColumnDropped: boolean;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "18 Mar 2023" (LinkedIn) or ISO → ISO date, else null. */
export function parseConnectedOn(raw: string): string | null {
  const text = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})$/.exec(text);
  if (match !== null) {
    const month = MONTHS[match[2]!.toLowerCase()];
    if (month !== undefined) {
      return `${match[3]}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
    }
  }
  return null;
}

function headerIndex(header: string[], ...names: string[]): number {
  const lowered = header.map((cell) => cell.trim().toLowerCase());
  for (const name of names) {
    const index = lowered.indexOf(name);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

/**
 * Tolerant of LinkedIn's export quirks: "Notes:" preamble lines before the
 * header, column-order variants, missing URL/Email columns. Header row =
 * the first row containing a first-name AND last-name column.
 */
export function parseConnectionsCsv(text: string): ConnectionsParseResult | { error: string } {
  const rows = parseCsv(text);
  let headerRow = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (
      headerIndex(rows[i]!, "first name", "firstname") !== -1 &&
      headerIndex(rows[i]!, "last name", "lastname") !== -1
    ) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) {
    return { error: "No LinkedIn header found — expected First Name / Last Name columns." };
  }
  const header = rows[headerRow]!;
  const first = headerIndex(header, "first name", "firstname");
  const last = headerIndex(header, "last name", "lastname");
  const company = headerIndex(header, "company");
  const position = headerIndex(header, "position", "title");
  const connected = headerIndex(header, "connected on", "connected");
  const email = headerIndex(header, "email address", "email");

  const connections: ParsedConnection[] = [];
  let skipped = 0;
  for (const cells of rows.slice(headerRow + 1)) {
    const display = [cells[first] ?? "", cells[last] ?? ""]
      .map((part) => part.trim())
      .filter((part) => part !== "")
      .join(" ");
    if (display === "") {
      skipped += 1;
      continue;
    }
    const companyRaw = company === -1 ? "" : (cells[company] ?? "").trim();
    const positionRaw = position === -1 ? "" : (cells[position] ?? "").trim();
    const connectedRaw = connected === -1 ? "" : (cells[connected] ?? "").trim();
    connections.push({
      display,
      company: companyRaw === "" ? null : companyRaw,
      position: positionRaw === "" ? null : positionRaw,
      connectedOn: connectedRaw === "" ? null : parseConnectedOn(connectedRaw),
    });
    // The email cell — if present — is deliberately never read.
  }
  return { connections, skipped, emailColumnDropped: email !== -1 };
}

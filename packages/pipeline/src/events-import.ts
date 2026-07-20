import "./env";
import { readFileSync } from "node:fs";
import { importEvent } from "@continuum/db";
import { EVENTS_CSV_HEADER, parseCsv, rowToImport } from "./events-parse";

/**
 * Operator CSV import (Phase 31A):
 *
 *   pnpm events:import -- file.csv [--approve]
 *
 * Columns: name,starts_on,ends_on,city,country,format,venue,url,classes,expected
 * (classes = semicolon-separated asset-class slugs; expected = true when the
 * dates are the recurring-annual pattern, not a published confirmation).
 *
 * Rows land as PROPOSED event entities awaiting /admin/review — --approve
 * is the registry-precedent operator flag for rows the operator has already
 * personally verified.
 */

const HEADER = EVENTS_CSV_HEADER as readonly string[];

async function main(): Promise<void> {
  const argv = process.argv.slice(2).filter((arg) => arg !== "--");
  const approve = argv.includes("--approve");
  const file = argv.find((arg) => !arg.startsWith("--"));
  if (file === undefined) {
    console.error("usage: pnpm events:import -- file.csv [--approve]");
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(file, "utf8"));
  const header = rows[0]?.map((cell) => cell.trim().toLowerCase());
  if (header === undefined || HEADER.some((column, index) => header[index] !== column)) {
    console.error(`header must be exactly: ${HEADER.join(",")}`);
    process.exit(1);
  }

  let created = 0;
  let duplicates = 0;
  let invalid = 0;
  for (const cells of rows.slice(1)) {
    const parsed = rowToImport(cells);
    if ("error" in parsed) {
      invalid += 1;
      console.log(`INVALID  ${parsed.error}`);
      continue;
    }
    const result = await importEvent(parsed, { approve, source: "operator" });
    if (result.outcome === "created") {
      created += 1;
      console.log(`${approve ? "APPROVED" : "PROPOSED"} ${parsed.name} (${parsed.startsOn}) → /events/${result.slug}`);
    } else if (result.outcome === "duplicate") {
      duplicates += 1;
      console.log(`SKIP     duplicate slug ${result.slug}`);
    } else {
      invalid += 1;
      console.log(`INVALID  ${result.reason}`);
    }
  }
  console.log(
    `\nevents:import — ${created} ${approve ? "approved" : "proposed"}, ${duplicates} duplicate(s), ${invalid} invalid.` +
      (approve ? "" : " Review at /admin/review?filter=events."),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

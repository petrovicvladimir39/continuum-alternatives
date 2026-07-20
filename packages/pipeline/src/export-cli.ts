import "./env";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  exportDocumentsCsv,
  exportEdgesCsv,
  exportEntitiesCsv,
  exportFactsCsv,
} from "@continuum/db";

/**
 * Export suite CLI (reset build Part 5) — the operator's raw-material files.
 *
 *   pnpm export:entities [-- --country LU --tag register_verified --kind organization --status active]
 *   pnpm export:edges
 *   pnpm export:facts [-- --channel distressed --since 2026-01-01]
 *   pnpm export:documents [-- --source newsroom --since 2026-01-01]
 *
 * Writes UTF-8-BOM CSVs (Excel-safe) into /exports (gitignored). Filenames
 * are stable per kind + filter so re-runs refresh in place.
 */

const EXPORT_DIR = path.resolve(process.cwd(), "../..", "exports");

function arg(name: string): string | undefined {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(`--${name}`);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

function writeCsv(basename: string, csv: string): void {
  mkdirSync(EXPORT_DIR, { recursive: true });
  const file = path.join(EXPORT_DIR, `${basename}.csv`);
  writeFileSync(file, "﻿" + csv, "utf8");
  const rows = csv.split("\r\n").length - 2; // minus header and trailing newline
  console.log(`wrote ${file} (${rows} rows)`);
}

function suffix(parts: (string | undefined)[]): string {
  return parts
    .filter((p): p is string => p !== undefined && p !== "")
    .map((p) => p.replace(/[^a-zA-Z0-9_-]+/g, "_"))
    .map((p) => `-${p}`)
    .join("");
}

async function main(): Promise<void> {
  const kind = process.argv[2];
  switch (kind) {
    case "entities": {
      const filter = {
        ...(arg("country") !== undefined ? { country: arg("country")!.toUpperCase() } : {}),
        ...(arg("tag") !== undefined ? { tag: arg("tag")! } : {}),
        ...(arg("kind") !== undefined ? { kind: arg("kind")! } : {}),
        ...(arg("status") !== undefined ? { status: arg("status")! } : {}),
      };
      const csv = await exportEntitiesCsv(filter);
      writeCsv(`entities${suffix([filter.country, filter.tag, filter.kind, filter.status])}`, csv);
      break;
    }
    case "edges": {
      writeCsv("edges", await exportEdgesCsv());
      break;
    }
    case "facts": {
      const filter = {
        ...(arg("channel") !== undefined ? { channel: arg("channel")! } : {}),
        ...(arg("since") !== undefined ? { since: arg("since")! } : {}),
      };
      writeCsv(`facts${suffix([filter.channel, filter.since])}`, await exportFactsCsv(filter));
      break;
    }
    case "documents": {
      const filter = {
        ...(arg("source") !== undefined ? { source: arg("source")! } : {}),
        ...(arg("since") !== undefined ? { since: arg("since")! } : {}),
      };
      writeCsv(
        `documents${suffix([filter.source, filter.since])}`,
        await exportDocumentsCsv(filter),
      );
      break;
    }
    default:
      console.error("usage: tsx src/export-cli.ts entities|edges|facts|documents [--filters]");
      process.exit(1);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

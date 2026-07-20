import "./env";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ENTITY_TAGS, isEuropeCountry } from "@continuum/shared";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "./client";
import { entities, entityTags, organizations } from "./schema";
import { createEntity } from "./repo/entities";
import { resolveEntity } from "./resolve";

/**
 * Universe seeding importer (Phase 15 U-A). CSV contract — see README:
 *   name,kind,country,city,website,tags,capital_note
 * kind is always "organization"; tags are ENTITY_TAGS values, semicolon-
 * separated; website is REQUIRED for curated rows. Idempotent: rows resolve
 * against the existing corpus first (resolveEntity), and only unmatched rows
 * create new entities — always status='provisional' + tag 'needs_verification'
 * so nothing reaches the public site before the live verification pass.
 */

type CsvRow = {
  name: string;
  kind: string;
  country: string;
  city: string;
  website: string;
  tags: string[];
  capitalNote: string;
  line: number;
};

/** Minimal RFC-4180 parser (quoted fields, embedded commas/quotes). No packages. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
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
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
  }
  return rows;
}

const VALID_TAGS = new Set<string>(ENTITY_TAGS);
const HEADER = ["name", "kind", "country", "city", "website", "tags", "capital_note"];

function loadRows(file: string): { rows: CsvRow[]; errors: string[] } {
  const raw = readFileSync(file, "utf8").replace(/^﻿/, "");
  const parsed = parseCsv(raw);
  const header = parsed[0];
  if (!header || header.map((h) => h.trim()).join(",") !== HEADER.join(",")) {
    throw new Error(`CSV header must be exactly: ${HEADER.join(",")}`);
  }
  const rows: CsvRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < parsed.length; i++) {
    const cells = parsed[i];
    if (!cells) {
      continue;
    }
    const line = i + 1;
    if (cells.length !== HEADER.length) {
      errors.push(`line ${line}: expected ${HEADER.length} fields, got ${cells.length}`);
      continue;
    }
    const [name, kind, country, city, website, tagsRaw, capitalNote] = cells.map((c) => c.trim());
    const tags = (tagsRaw ?? "")
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);
    const bad: string[] = [];
    if (!name) {
      bad.push("name missing");
    }
    if (kind !== "organization") {
      bad.push(`kind must be organization (got "${kind}")`);
    }
    if (!/^[A-Z]{2}$/.test(country ?? "")) {
      bad.push(`country must be 2-letter code (got "${country}")`);
    } else if (!isEuropeCountry(country ?? "")) {
      bad.push(`country "${country}" is outside EUROPE_COUNTRIES scope`);
    }
    if (!website || !/^https?:\/\//.test(website)) {
      bad.push("website is REQUIRED (http/https url)");
    }
    const unknownTags = tags.filter((t) => !VALID_TAGS.has(t));
    if (unknownTags.length > 0) {
      bad.push(`unknown tags: ${unknownTags.join(", ")}`);
    }
    if (bad.length > 0) {
      errors.push(`line ${line} (${name || "?"}): ${bad.join("; ")}`);
      continue;
    }
    rows.push({
      name: name ?? "",
      kind: kind ?? "",
      country: country ?? "",
      city: city ?? "",
      website: website ?? "",
      tags,
      capitalNote: capitalNote ?? "",
      line,
    });
  }
  return { rows, errors };
}

async function unionTags(entityId: string, tags: string[]) {
  if (tags.length === 0) {
    return;
  }
  const existing = await db
    .select({ tag: entityTags.tag })
    .from(entityTags)
    .where(and(eq(entityTags.entityId, entityId), inArray(entityTags.tag, tags)));
  const have = new Set(existing.map((row) => row.tag));
  const missing = tags.filter((tag) => !have.has(tag));
  if (missing.length > 0) {
    await db.insert(entityTags).values(missing.map((tag) => ({ entityId, tag })));
  }
}

async function mergeIntoExisting(entityId: string, row: CsvRow) {
  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.entityId, entityId));
  const org = orgRows[0];
  if (org === undefined) {
    await db.insert(organizations).values({
      entityId,
      hqCity: row.city || null,
      website: row.website,
    });
  } else {
    const patch: Partial<typeof organizations.$inferInsert> = {};
    if (org.hqCity === null && row.city !== "") {
      patch.hqCity = row.city;
    }
    if (org.website === null) {
      patch.website = row.website;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(organizations).set(patch).where(eq(organizations.entityId, entityId));
    }
  }
  await unionTags(entityId, row.tags);
}

async function createProvisional(row: CsvRow) {
  const entity = await createEntity({
    kind: "organization",
    name: row.name,
    country: row.country,
    tags: [...row.tags, "needs_verification"],
    ...(row.capitalNote !== "" ? { summary: row.capitalNote } : {}),
  });
  // Nothing from the curated CSV goes live without the verification pass.
  await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, entity.id));
  await db.insert(organizations).values({
    entityId: entity.id,
    hqCity: row.city || null,
    website: row.website,
  });
  return entity;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: pnpm universe:import -- <file.csv>");
    process.exit(1);
  }
  const file = existsSync(arg) ? arg : path.resolve(process.cwd(), "../..", arg);
  if (!existsSync(file)) {
    console.error(`file not found: ${arg}`);
    process.exit(1);
  }

  const { rows, errors } = loadRows(file);
  for (const error of errors) {
    console.error(`SKIP  ${error}`);
  }

  let matched = 0;
  let created = 0;
  let skipped = errors.length;
  const ambiguous: string[] = [];

  for (const row of rows) {
    const result = await resolveEntity({
      name: row.name,
      country: row.country,
      kindHint: "organization",
    });
    if (result.outcome === "matched" && result.entityId !== undefined) {
      // The alias-exact path in resolveEntity does not compare countries; a
      // same-name firm in a different country is a DIFFERENT entity (e.g. a
      // Serbian debtor "GENESIS CAPITAL" vs the Czech GP). Country conflict →
      // create a separate provisional entity instead of merging.
      const matchedEntity = (
        await db
          .select({ country: entities.country })
          .from(entities)
          .where(eq(entities.id, result.entityId))
      )[0];
      const countryConflict =
        matchedEntity !== undefined &&
        matchedEntity.country !== null &&
        matchedEntity.country.toUpperCase() !== row.country.toUpperCase();
      if (countryConflict) {
        const entity = await createProvisional(row);
        created += 1;
        console.log(
          `new   ${row.name} -> ${entity.slug} (country conflict with ${result.candidates[0]?.slug ?? result.entityId}; separate entity)`,
        );
      } else {
        await mergeIntoExisting(result.entityId, row);
        matched += 1;
        console.log(
          `match ${row.name} -> ${result.candidates[0]?.slug ?? result.entityId} (${result.via})`,
        );
      }
    } else if (result.outcome === "ambiguous") {
      // Never merge on ambiguity — report for human review instead.
      skipped += 1;
      ambiguous.push(
        `${row.name} ~ ${result.candidates
          .slice(0, 3)
          .map((c) => `${c.slug}(${c.score})`)
          .join(", ")}`,
      );
      console.log(`skip  ${row.name} (ambiguous)`);
    } else {
      const entity = await createProvisional(row);
      created += 1;
      console.log(`new   ${row.name} -> ${entity.slug} (provisional, needs_verification)`);
    }
  }

  if (ambiguous.length > 0) {
    console.log("\nambiguous rows (skipped, review manually):");
    for (const line of ambiguous) {
      console.log(`  ${line}`);
    }
  }
  console.log(
    `\nuniverse-import: ${rows.length + errors.length} rows — matched ${matched}, created ${created}, skipped ${skipped}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

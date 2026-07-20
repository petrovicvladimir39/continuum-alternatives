import "./env";
import { csvEscape, exportEntitiesCsv, exportFactsCsv } from "@continuum/db";

/**
 * Verify: export CSV layer (reset build Part 5) — shape, escaping, filters.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

async function main(): Promise<void> {
  console.log("— csv escaping —");
  check(csvEscape("plain") === "plain", "plain value untouched");
  check(csvEscape('a "quoted" name') === '"a ""quoted"" name"', "quotes doubled and wrapped");
  check(csvEscape("has,comma") === '"has,comma"', "commas wrapped");
  check(csvEscape("line\nbreak") === '"line\nbreak"', "newlines wrapped");
  check(csvEscape(null) === "" && csvEscape(undefined) === "", "null/undefined → empty");

  console.log("\n— entities export shape —");
  const csv = await exportEntitiesCsv({ status: "active" });
  const lines = csv.split("\r\n").filter((l) => l !== "");
  check(
    lines[0] === "slug,kind,name,country,status,city,website,registry_id,tags,summary,created_on",
    "header row exact",
  );
  check(lines.length > 1, `data rows present (got ${lines.length - 1})`);
  const cols = lines[0]!.split(",").length;
  // Column-count invariant on a sample of rows (escaped commas stay inside quotes).
  const sample = lines.slice(1, 50);
  check(
    sample.every((line) => {
      let inQuotes = false;
      let count = 1;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (line[i] === "," && !inQuotes) {
          count++;
        }
      }
      return count === cols;
    }),
    "every sampled row has the header's column count",
  );

  console.log("\n— filter behavior —");
  const luCsv = await exportEntitiesCsv({ country: "LU", status: "active" });
  const luRows = luCsv.split("\r\n").filter((l) => l !== "").slice(1);
  check(luRows.length > 0, "LU filter returns rows");
  check(
    luRows.every((row) => row.includes(",LU,")),
    "all filtered rows carry the LU country column",
  );
  const registerCsv = await exportEntitiesCsv({ tag: "register_verified", country: "LU" });
  const registerRows = registerCsv.split("\r\n").filter((l) => l !== "").slice(1);
  check(
    registerRows.length > 0 && registerRows.every((row) => row.includes("register_verified")),
    `"LEI funds in LU"-style tag+country view works (${registerRows.length} rows)`,
  );

  console.log("\n— facts export shape —");
  const factsCsv = await exportFactsCsv({});
  const factsLines = factsCsv.split("\r\n").filter((l) => l !== "");
  check(
    factsLines[0] ===
      "entity_slug,entity_name,fact_type,occurred_on,recorded_on,title,channels,confidence,status,source_document_id",
    "facts header exact",
  );
  check(factsLines.length > 1, "facts rows present");

  if (failures > 0) {
    console.error(`\nverify-export: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-export: PASS — export shapes and filters green");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

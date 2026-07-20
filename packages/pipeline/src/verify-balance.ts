import "./env";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EUROPE_COUNTRIES, diversifyRail, pickRotatedLead } from "@continuum/shared";

/**
 * Verify: anti-skew rules + positioning reset (reset build Part 7).
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

type Item = { id: number; country: string | null };
const item = (id: number, country: string | null): Item => ({ id, country });
const countryOf = (x: Item) => x.country;

async function main(): Promise<void> {
  console.log("— rail diversity —");
  const monoHeavy = [
    item(1, "RS"), item(2, "RS"), item(3, "RS"), item(4, "RS"),
    item(5, "PL"), item(6, "CZ"), item(7, "RS"), item(8, "DE"),
  ];
  const rail = diversifyRail(monoHeavy, 5, countryOf);
  check(rail.filter((x) => x.country === "RS").length <= 2, "max 2 items per country");
  check(rail.length === 5, `rail refilled to limit (got ${rail.length})`);
  check(
    rail.map((x) => x.id).join(",") === "1,2,5,6,8",
    `order preserved with deferrals (got ${rail.map((x) => x.id).join(",")})`,
  );
  const spread = diversifyRail(
    [item(1, "LU"), item(2, "FR"), item(3, "DE"), item(4, "NL"), item(5, "ES")],
    5,
    countryOf,
  );
  check(spread.length === 5, "diverse input passes untouched");
  const nulls = diversifyRail(
    [item(1, null), item(2, null), item(3, null), item(4, null)],
    4,
    countryOf,
  );
  check(nulls.length === 4, "unknown-country items always pass");
  const share = diversifyRail(
    [item(1, "RS"), item(2, "RS"), item(3, "PL"), item(4, "PL"), item(5, "CZ"), item(6, "CZ"), item(7, "DE"), item(8, "AT"), item(9, "FR"), item(10, "IT")],
    10,
    countryOf,
  );
  const counts = new Map<string, number>();
  for (const x of share) {
    if (x.country !== null) {
      counts.set(x.country, (counts.get(x.country) ?? 0) + 1);
    }
  }
  check(
    [...counts.values()].every((n) => n <= Math.max(2, Math.floor(0.4 * share.length))),
    "no country above 40% on long rails",
  );

  console.log("\n— lead rotation —");
  const leads = [item(1, "RS"), item(2, "RS"), item(3, "PL"), item(4, "DE")];
  check(pickRotatedLead(leads, "RS", countryOf) === 2, "same country as yesterday → next different country leads");
  check(pickRotatedLead(leads, "PL", countryOf) === 0, "different country → newest leads");
  check(pickRotatedLead(leads, null, countryOf) === 0, "no previous lead → newest leads");
  check(
    pickRotatedLead([item(1, "RS"), item(2, "RS")], "RS", countryOf) === 0,
    "no alternative country → newest still leads (no forced hole)",
  );

  console.log("\n— positioning grep (identity surfaces) —");
  const root = path.resolve(process.cwd(), "../..");
  const surfaces = [
    "apps/web/src/app/layout.tsx",
    "apps/web/src/app/(site)/about/page.tsx",
    "apps/web/public/llms.txt",
    "README.md",
    "apps/web/src/lib/profile-seo.ts",
    "packages/pipeline/src/digest-email.ts",
    "apps/web/src/app/(site)/reports/page.tsx",
  ];
  for (const file of surfaces) {
    const text = readFileSync(path.join(root, file), "utf8");
    check(
      !/emerging Europe/i.test(text) && !/\bCEE\b/.test(text),
      `${file} carries no emerging-Europe/CEE identity framing`,
    );
  }
  const layout = readFileSync(path.join(root, "apps/web/src/app/layout.tsx"), "utf8");
  check(
    layout.includes("The map of European alternative assets"),
    "root metadata carries the new tagline",
  );

  console.log("\n— scope constant —");
  check(EUROPE_COUNTRIES.length === 39, `EUROPE_COUNTRIES = EU27 + GB/CH/NO/IS + Balkans (got ${EUROPE_COUNTRIES.length})`);
  check(
    ["FR", "DE", "GB", "CH", "NO", "IS", "RS", "XK", "UA"].every((c) => EUROPE_COUNTRIES.includes(c)),
    "key members present",
  );
  check(!EUROPE_COUNTRIES.includes("US"), "US outside scope");

  if (failures > 0) {
    console.error(`\nverify-balance: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-balance: PASS — anti-skew + positioning green");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

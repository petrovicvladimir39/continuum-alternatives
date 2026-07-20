import "./env";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  composeTodayStrip,
  parseAsk,
  removeChipFromQuery,
  VERTICALS,
} from "@continuum/shared";
import {
  createSavedView,
  db,
  deleteSavedView,
  eq,
  listSavedViews,
  memberProfiles,
  upsertMemberProfile,
} from "@continuum/db";

/**
 * Verify: Phase 25 — ask parser (30+ fixtures), URL round-trip, /map
 * redirect, saved-view CRUD + scoping, Today-strip composition, verticals.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const TEST_CLERK_ID = "user_verify_ask_fixture";

async function cleanup(): Promise<void> {
  const rows = await db
    .select({ id: memberProfiles.id })
    .from(memberProfiles)
    .where(eq(memberProfiles.clerkUserId, TEST_CLERK_ID));
  for (const row of rows) {
    const views = await listSavedViews(row.id);
    for (const view of views) {
      await deleteSavedView(row.id, view.id);
    }
  }
  await db.delete(memberProfiles).where(eq(memberProfiles.clerkUserId, TEST_CLERK_ID));
}

type Expect = {
  q: string;
  channels?: string[];
  countries?: string[];
  factTypes?: string[];
  freeText?: string;
  null?: boolean;
};

const FIXTURES: Expect[] = [
  // vertical + type + country combinations
  { q: "distressed deals in Poland", channels: ["distressed"], factTypes: ["acquisition"], countries: ["PL"] },
  { q: "pe buyouts Germany", channels: ["pe"], countries: ["DE"] },
  { q: "private equity France", channels: ["pe"], countries: ["FR"] },
  { q: "venture rounds in Czechia", channels: ["vc_founders"], factTypes: ["funding_round"], countries: ["CZ"] },
  { q: "vc startups", channels: ["vc_founders"] },
  { q: "direct lending Netherlands", channels: ["private_credit"], countries: ["NL"] },
  { q: "private credit", channels: ["private_credit"] },
  { q: "npl auctions Serbia", channels: ["distressed"], factTypes: ["asset_sale_announced"], countries: ["RS"] },
  { q: "insolvencies in Croatia", factTypes: ["insolvency_opened"], countries: ["HR"] },
  { q: "special situations Italy", channels: ["distressed"], countries: ["IT"] },
  { q: "lp fund closes", channels: ["lp_institutional"], factTypes: ["fund_close"] },
  { q: "institutional investors Sweden", channels: ["lp_institutional"], countries: ["SE"], freeText: "investors" },
  { q: "advisors mandates", channels: ["vendors"] },
  { q: "law firms Austria", channels: ["vendors"], countries: ["AT"], freeText: "firms" },
  // multilingual country names
  { q: "distressed Polska", channels: ["distressed"], countries: ["PL"] },
  { q: "startups Česko", channels: ["vc_founders"], countries: ["CZ"] },
  { q: "buyouts Deutschland", channels: ["pe"], countries: ["DE"] },
  { q: "credit España", channels: ["private_credit"], countries: ["ES"] },
  { q: "deals Italia", factTypes: ["acquisition"], countries: ["IT"] },
  { q: "insolvency Srbija", channels: ["distressed"], countries: ["RS"] },
  { q: "rounds Magyarország", factTypes: ["funding_round"], countries: ["HU"] },
  { q: "auctions Hrvatska", factTypes: ["asset_sale_announced"], countries: ["HR"] },
  // ISO codes + UK aliases
  { q: "pe GB", channels: ["pe"], countries: ["GB"] },
  { q: "distressed uk", channels: ["distressed"], countries: ["GB"] },
  { q: "vc britain", channels: ["vc_founders"], countries: ["GB"] },
  { q: "credit CZ", channels: ["private_credit"], countries: ["CZ"] },
  // multi-country
  { q: "deals Poland Romania", factTypes: ["acquisition"], countries: ["PL", "RO"] },
  // entity fallthrough / free text
  { q: "Enterprise Investors", freeText: "Enterprise Investors" },
  { q: "Uljanik", freeText: "Uljanik" },
  { q: "distressed Uljanik", channels: ["distressed"], freeText: "Uljanik" },
  // phrase priority: "fund closes" is a type, not free text
  { q: "fund closes Luxembourg", factTypes: ["fund_close"], countries: ["LU"] },
  // stopwords vanish
  { q: "deals in the Poland", factTypes: ["acquisition"], countries: ["PL"] },
  // garbage / empties
  { q: "", null: true },
  { q: "    ", null: true },
  { q: "in the of and", null: true },
  { q: "xyzzy plugh", freeText: "xyzzy plugh" },
];

async function main(): Promise<void> {
  console.log(`— ask parser (${FIXTURES.length} fixtures) —`);
  for (const fixture of FIXTURES) {
    const parsed = parseAsk(fixture.q);
    if (fixture.null === true) {
      check(parsed === null, `"${fixture.q}" → null`);
      continue;
    }
    const ok =
      parsed !== null &&
      JSON.stringify([...(fixture.channels ?? [])].sort()) === JSON.stringify([...parsed.channels].sort()) &&
      JSON.stringify([...(fixture.countries ?? [])].sort()) === JSON.stringify([...parsed.countries].sort()) &&
      JSON.stringify([...(fixture.factTypes ?? [])].sort()) === JSON.stringify([...parsed.factTypes].sort()) &&
      (fixture.freeText ?? "") === parsed.freeText;
    check(
      ok,
      `"${fixture.q}" → ${JSON.stringify({ ch: parsed?.channels, co: parsed?.countries, ft: parsed?.factTypes, free: parsed?.freeText })}`,
    );
  }

  console.log("\n— URL round-trip + chip removal —");
  const query = "distressed deals in Poland";
  const parsed = parseAsk(query)!;
  const reParsed = parseAsk(query)!;
  check(JSON.stringify(parsed) === JSON.stringify(reParsed), "same q parses identically (shareable URLs)");
  const countryChip = parsed.matches.find((m) => m.kind === "country")!;
  const without = removeChipFromQuery(query, countryChip.tokens);
  const afterRemoval = parseAsk(without);
  check(
    afterRemoval !== null && afterRemoval.countries.length === 0 && afterRemoval.channels.includes("distressed"),
    `chip removal drops only its filter ("${without}")`,
  );
  check(removeChipFromQuery("pe", ["pe"]) === "", "removing the last chip empties the query");

  console.log("\n— /map → /ecosystem redirect + nav —");
  const nextConfig = readFileSync(
    path.resolve(process.cwd(), "../..", "apps/web/next.config.ts"),
    "utf8",
  );
  check(
    nextConfig.includes('source: "/map"') &&
      nextConfig.includes('destination: "/ecosystem"') &&
      nextConfig.includes("permanent: true"),
    "next.config declares the 301",
  );
  check(VERTICALS.length === 6, "six market verticals configured");
  check(
    VERTICALS.every((v) => v.channels.length > 0 && v.tags.length > 0 && v.scope.length > 10),
    "every vertical carries channels, tags, and a scope sentence",
  );

  console.log("\n— saved views CRUD + scoping (real DB) —");
  await cleanup();
  const member = await upsertMemberProfile({ clerkUserId: TEST_CLERK_ID, email: "ask@test.test" });
  const view = await createSavedView(member.id, "Distressed · Poland", {
    q: "distressed Poland",
    channels: ["distressed"],
    countries: ["PL"],
  });
  check(view.name === "Distressed · Poland", "create returns the view");
  const listed = await listSavedViews(member.id);
  check(listed.length === 1 && listed[0]!.id === view.id, "list returns member's views");
  const otherMember = await upsertMemberProfile({ clerkUserId: `${TEST_CLERK_ID}_other`, email: null });
  check((await listSavedViews(otherMember.id)).length === 0, "views are member-scoped");
  check(
    !(await deleteSavedView(otherMember.id, view.id)),
    "cross-member delete is a no-op (auth stays app-layer, repo enforces scope)",
  );
  check(await deleteSavedView(member.id, view.id), "owner delete works");
  check((await listSavedViews(member.id)).length === 0, "deleted view gone");
  await db.delete(memberProfiles).where(eq(memberProfiles.clerkUserId, `${TEST_CLERK_ID}_other`));
  await cleanup();

  console.log("\n— Today strip composition —");
  check(
    composeTodayStrip({ weekday: "Tuesday", newSignals: 12, countries: 6, auctionsClosingThisWeek: 3, fundUpdates: 2 }) ===
      "Tuesday: 12 new signals across 6 countries · 3 auctions closing this week · 2 fund updates",
    "full sentence composes",
  );
  check(
    composeTodayStrip({ weekday: "Monday", newSignals: 1, countries: 1, auctionsClosingThisWeek: 0, fundUpdates: 0 }) ===
      "Monday: 1 new signal",
    "singulars + single-country suppression",
  );
  check(
    composeTodayStrip({ weekday: "Sunday", newSignals: 0, countries: 0, auctionsClosingThisWeek: 0, fundUpdates: 0 }) === null,
    "empty day → null (strip hidden)",
  );
  check(
    composeTodayStrip({ weekday: "Friday", newSignals: 0, countries: 0, auctionsClosingThisWeek: 1, fundUpdates: 0 }) ===
      "Friday: 1 auction closing this week",
    "partial day composes only what exists",
  );

  if (failures > 0) {
    console.error(`\nverify-ask: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-ask: PASS — ask bar, IA, saved views, today strip green");
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

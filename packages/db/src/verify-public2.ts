import "./env";
import { inArray, like, or } from "drizzle-orm";
import { db } from "./client";
import {
  aliases,
  edges,
  entities,
  entityTags,
  organizations,
  timelineFacts,
} from "./schema";
import { createEntity } from "./repo/entities";
import { createEdge } from "./repo/edges";
import {
  auctionValueOf,
  daysUntil,
  degreeRanking,
  groupAdministrators,
  listAuctions,
  listFeed,
} from "./repo/feed";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

const FIXTURE_TYPE = "cli_test_feed";
const FIXTURE_COUNTRY = "ZZ"; // never used by real entities

async function cleanup(): Promise<number> {
  const rows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(like(entities.slug, "cli-test-feed-%"));
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(timelineFacts).where(inArray(timelineFacts.entityId, ids));
    await db
      .delete(edges)
      .where(
        or(
          inArray(edges.sourceEntityId, ids),
          inArray(edges.targetEntityId, ids),
          inArray(edges.dealEntityId, ids),
        ),
      );
    await db.delete(entityTags).where(inArray(entityTags.entityId, ids));
    await db.delete(aliases).where(inArray(aliases.entityId, ids));
    await db.delete(organizations).where(inArray(organizations.entityId, ids));
    await db.delete(entities).where(inArray(entities.id, ids));
  }
  return ids.length;
}

async function main() {
  const removed = await cleanup();
  if (removed > 0) {
    console.log(`(cleaned ${removed} leftover cli-test-feed entities first)`);
  }

  console.log("— countdown math (pure) —");
  check(daysUntil("2026-07-20", "2026-07-20") === 0, "same day → 0");
  check(daysUntil("2026-07-21", "2026-07-20") === 1, "tomorrow → 1");
  check(daysUntil("2026-08-01", "2026-07-20") === 12, "in 12 days");
  check(daysUntil("2026-07-19", "2026-07-20") === -1, "yesterday → -1");
  check(daysUntil("2027-07-20", "2026-07-20") === 365, "across a year boundary");

  console.log("\n— value display rule (pure, never fake) —");
  check(
    JSON.stringify(auctionValueOf({ estimatedValue: 2553054 })) ===
      JSON.stringify({ kind: "numeric", value: 2553054 }),
    "numeric present → numeric",
  );
  check(
    JSON.stringify(auctionValueOf({ estimatedValue: 0, estimatedValueText: "0,00" })) ===
      JSON.stringify({ kind: "numeric", value: 0 }),
    "numeric zero is still the source's number",
  );
  check(
    JSON.stringify(auctionValueOf({ estimatedValueText: "po dogovoru" })) ===
      JSON.stringify({ kind: "raw", text: "po dogovoru" }),
    "text only → raw verbatim",
  );
  check(JSON.stringify(auctionValueOf({})) === JSON.stringify({ kind: "none" }), "neither → none (—)");
  check(JSON.stringify(auctionValueOf(null)) === JSON.stringify({ kind: "none" }), "null data → none");

  console.log("\n— administrator grouping (pure) —");
  const grouped = groupAdministrators([
    { name: "Ивица Августинов", n: 3 },
    { name: "Ivica Avgustinov", n: 2 }, // transliteration variant — must merge
    { name: "Игор Шобић", n: 2 },
    { name: "Соло Управник", n: 1 }, // below min-2 threshold — must drop
  ]);
  check(grouped.length === 2, `min-2 threshold drops singles (got ${grouped.length})`);
  check(
    grouped[0]?.label === "Ивица Августинов" && grouped[0]?.n === 5,
    "script variants merge; most frequent raw spelling displays",
  );
  check(grouped[1]?.label === "Игор Шобић" && grouped[1]?.n === 2, "second group intact");

  console.log("\n— fixtures —");
  const debtor = await createEntity({
    kind: "organization",
    name: "CLI Test Feed Debtor",
    country: FIXTURE_COUNTRY,
  });
  const other = await createEntity({
    kind: "organization",
    name: "CLI Test Feed Other",
    country: FIXTURE_COUNTRY,
  });
  const hub = await createEntity({
    kind: "organization",
    name: "CLI Test Feed Hub",
    country: FIXTURE_COUNTRY,
  });
  // Slugs must match the cli-test-feed-% cleanup pattern.
  check(
    [debtor, other, hub].every((entity) => entity.slug.startsWith("cli-test-feed-")),
    "fixture slugs carry the cleanup prefix",
  );

  const TODAY = "2026-07-20";
  await db.insert(timelineFacts).values([
    {
      entityId: debtor.id,
      factType: FIXTURE_TYPE,
      occurredOn: "2026-07-01",
      title: "Fixture feed item A",
      audienceChannels: ["distressed"],
      status: "approved",
    },
    {
      entityId: debtor.id,
      factType: FIXTURE_TYPE,
      occurredOn: "2026-07-02",
      title: "Fixture feed item B",
      audienceChannels: ["pe"],
      status: "approved",
    },
    {
      entityId: other.id,
      factType: FIXTURE_TYPE,
      occurredOn: "2026-07-03",
      title: "Fixture feed item C (proposed — must not appear)",
      audienceChannels: ["distressed"],
      status: "proposed",
    },
    // Auction fixtures around the injectable today boundary:
    {
      entityId: debtor.id,
      factType: "asset_sale_announced",
      occurredOn: TODAY,
      title: "Fixture sale today",
      status: "approved",
      data: { method: "Јавно надметање", place: "Тестоград", estimatedValue: 1000000 },
    },
    {
      entityId: debtor.id,
      factType: "asset_sale_announced",
      occurredOn: "2026-07-23",
      title: "Fixture sale +3",
      status: "approved",
      data: { method: "Јавно прикупљање понуда", place: "Тестоград", estimatedValueText: "по договору" },
    },
    {
      entityId: debtor.id,
      factType: "asset_sale_announced",
      occurredOn: "2026-07-19",
      title: "Fixture sale past",
      status: "approved",
      data: {},
    },
    {
      entityId: debtor.id,
      factType: "insolvency_opened",
      occurredOn: "2026-01-05",
      title: "Fixture insolvency",
      status: "approved",
      data: { court: "Привредни суд у Тестограду" },
    },
  ]);

  await createEdge({ edgeType: "invested_in", sourceSlug: hub.slug, targetSlug: debtor.slug });
  await createEdge({ edgeType: "lent_to", sourceSlug: hub.slug, targetSlug: other.slug });
  await createEdge({ edgeType: "advised_on", sourceSlug: hub.slug, targetSlug: debtor.slug });
  await createEdge({ edgeType: "audits", sourceSlug: hub.slug, targetSlug: other.slug });
  await createEdge({ edgeType: "values", sourceSlug: hub.slug, targetSlug: debtor.slug });
  await createEdge({ edgeType: "serviced_by", sourceSlug: other.slug, targetSlug: hub.slug });
  console.log("seeded feed/auction/degree fixtures");

  console.log("\n— feed filter composition —");
  const byType = await listFeed({ factType: FIXTURE_TYPE });
  check(byType.total === 2, `approved-only + type filter (got ${byType.total})`);
  check(
    byType.items[0]?.title === "Fixture feed item B" && byType.items[1]?.title === "Fixture feed item A",
    "occurred_on desc ordering",
  );
  const composed = await listFeed({
    factType: FIXTURE_TYPE,
    channel: "distressed",
    country: FIXTURE_COUNTRY,
  });
  check(
    composed.total === 1 && composed.items[0]?.title === "Fixture feed item A",
    "channel+country+type compose conjunctively",
  );
  const wrongCountry = await listFeed({ factType: FIXTURE_TYPE, country: "XX" });
  check(wrongCountry.total === 0, "non-matching country yields zero");

  console.log("\n— pagination bounds —");
  const beyond = await listFeed({ factType: FIXTURE_TYPE, page: 99 });
  check(
    beyond.items.length === 0 && beyond.pageCount === 1 && beyond.page === 99,
    "page beyond range returns empty items with honest pageCount",
  );
  const negative = await listFeed({ factType: FIXTURE_TYPE, page: -5 });
  check(negative.page === 1 && negative.items.length === 2, "page clamps to 1");

  console.log("\n— auction split at the today boundary —");
  const upcoming = await listAuctions("upcoming", { today: TODAY });
  const upcomingFixtures = upcoming.rows.filter((row) => row.debtorName === debtor.name);
  check(upcomingFixtures.length === 2, `today-inclusive upcoming (got ${upcomingFixtures.length})`);
  check(
    upcomingFixtures[0]?.saleDate === TODAY && upcomingFixtures[0]?.daysUntil === 0,
    "soonest first; today counts as 0 days",
  );
  check(
    upcomingFixtures[1]?.daysUntil === 3 &&
      upcomingFixtures[1]?.value.kind === "raw" &&
      upcomingFixtures[1]?.value.kind === "raw",
    "countdown + raw-text value flow through",
  );
  check(
    upcomingFixtures[0]?.value.kind === "numeric" &&
      upcomingFixtures[0]?.court === "Привредни суд у Тестограду",
    "numeric value + court joined from the insolvency filing",
  );
  const past = await listAuctions("past", { today: TODAY });
  const pastFixtures = past.rows.filter((row) => row.debtorName === debtor.name);
  check(
    pastFixtures.length === 1 &&
      pastFixtures[0]?.saleDate === "2026-07-19" &&
      pastFixtures[0]?.value.kind === "none",
    "past archive gets yesterday's sale; empty value renders none",
  );

  console.log("\n— degree ranking —");
  const degrees = await degreeRanking(20);
  const hubRow = degrees.find((row) => row.label === hub.name);
  check(hubRow !== undefined && hubRow.n === 6, `hub degree counted (got ${hubRow?.n})`);
  check(degrees[0]?.label === hub.name, "highest-degree entity ranks first");
  const hubIndex = degrees.findIndex((row) => row.label === hub.name);
  const debtorIndex = degrees.findIndex((row) => row.label === debtor.name);
  check(
    debtorIndex === -1 || hubIndex < debtorIndex,
    "ordering is by degree descending",
  );

  console.log("\n— cleanup —");
  const deleted = await cleanup();
  check(deleted === 3, `cleanup removed all fixtures (${deleted})`);

  if (failures > 0) {
    console.error(`\nverify-public2: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-public2: PASS — feed, auctions, and rankings green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

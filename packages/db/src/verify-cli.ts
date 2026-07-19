import "./env";
import { normalizeAlias, slugify } from "@continuum/shared";
import { inArray, like, or } from "drizzle-orm";
import { db } from "./client";
import {
  aliases,
  assets,
  deals,
  edges,
  entities,
  entityTags,
  events,
  fundVehicles,
  organizations,
  people,
  timelineFacts,
} from "./schema";
import { createEdge, listEdges } from "./repo/edges";
import { createEntity, findEntities, getBySlug } from "./repo/entities";
import { findPath } from "./repo/graph";
import { addFact, getTimeline } from "./repo/timeline";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

function checkEqual(actual: string, expected: string, message: string) {
  check(actual === expected, `${message} (got "${actual}", expected "${expected}")`);
}

async function cleanup() {
  const rows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(like(entities.slug, "cli-test-%"));
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) {
    return 0;
  }
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
  await db.delete(people).where(inArray(people.entityId, ids));
  await db.delete(fundVehicles).where(inArray(fundVehicles.entityId, ids));
  await db.delete(deals).where(inArray(deals.entityId, ids));
  await db.delete(assets).where(inArray(assets.entityId, ids));
  await db.delete(events).where(inArray(events.entityId, ids));
  await db.delete(entities).where(inArray(entities.id, ids));
  return ids.length;
}

async function main() {
  console.log("— slugify / normalizeAlias —");
  checkEqual(
    slugify("Đorđević & Partneri d.o.o."),
    "djordjevic-partneri-doo",
    "slugify transliterates đ→dj and strips punctuation",
  );
  checkEqual(slugify("Țiriac Holdings  S.A."), "tiriac-holdings-sa", "slugify handles ș/ț/spaces");
  checkEqual(slugify("Öko-Bank Zrt."), "oko-bank-zrt", "slugify keeps existing hyphens");
  checkEqual(
    normalizeAlias("Đorđević & Partneri d.o.o."),
    "djordjevic partneri doo",
    "normalizeAlias single-spaces and strips punctuation",
  );
  checkEqual(normalizeAlias("  ČEZ   Group  "), "cez group", "normalizeAlias collapses whitespace");

  console.log("\n— repository end-to-end (cli-test-*) —");
  const removed = await cleanup();
  if (removed > 0) {
    console.log(`(cleaned ${removed} leftover cli-test entities first)`);
  }

  const seller = await createEntity({
    kind: "organization",
    name: "CLI Test Seller Bank",
    country: "RS",
    tags: ["bank"],
  });
  const buyer = await createEntity({
    kind: "organization",
    name: "CLI Test Buyer Fund Management",
    tags: ["gp_distressed"],
  });
  const deal = await createEntity({
    kind: "deal",
    name: "CLI Test Portfolio Sale 2026",
  });
  check(seller.slug === "cli-test-seller-bank", `seller slug generated (${seller.slug})`);
  check(buyer.slug === "cli-test-buyer-fund-management", `buyer slug generated (${buyer.slug})`);
  check(deal.slug === "cli-test-portfolio-sale-2026", `deal slug generated (${deal.slug})`);

  const duplicate = await createEntity({ kind: "organization", name: "CLI Test Seller Bank" });
  checkEqual(duplicate.slug, "cli-test-seller-bank-2", "slug collision appends -2");

  await createEdge({
    edgeType: "sold_portfolio_to",
    sourceSlug: seller.slug,
    targetSlug: buyer.slug,
    dealSlug: deal.slug,
    amount: "25000000",
    currency: "EUR",
  });
  await createEdge({
    edgeType: "advised_on",
    sourceSlug: buyer.slug,
    targetSlug: deal.slug,
    role: "test fixture",
  });

  let unknownSlugThrew = false;
  try {
    await createEdge({
      edgeType: "manages",
      sourceSlug: "cli-test-nonexistent",
      targetSlug: buyer.slug,
    });
  } catch (err) {
    unknownSlugThrew = err instanceof Error && err.message.includes("cli-test-nonexistent");
  }
  check(unknownSlugThrew, "createEdge throws clearly on unknown slug");

  await addFact({
    entitySlug: deal.slug,
    factType: "deal_announced",
    occurredOn: "2026-02-01",
    title: "CLI test deal announced",
    channels: ["distressed"],
  });

  const hits = await findEntities("CLI Test");
  check(hits.length === 4, `findEntities("CLI Test") returns all fixtures (got ${hits.length})`);
  const aliasHits = await findEntities("cli test buyer fund");
  check(
    aliasHits.some((hit) => hit.slug === buyer.slug),
    "findEntities matches via normalized alias",
  );
  const sellerHit = hits.find((hit) => hit.slug === seller.slug);
  check(sellerHit !== undefined && sellerHit.tags.includes("bank"), "findEntities returns tags");

  const shown = await getBySlug(seller.slug);
  check(shown !== null && shown.entity.name === "CLI Test Seller Bank", "getBySlug returns entity");
  check(shown !== null && shown.tags.includes("bank"), "getBySlug returns tags");

  const sellerEdges = await listEdges(seller.slug, "out");
  check(sellerEdges.length === 1 && sellerEdges[0]?.targetSlug === buyer.slug, "listEdges out");
  const dealEdges = await listEdges(deal.slug, "in");
  check(dealEdges.length === 1 && dealEdges[0]?.sourceSlug === buyer.slug, "listEdges in");

  const direct = await findPath(seller.slug, buyer.slug);
  check(direct !== null && direct.hops === 1, "findPath finds direct 1-hop path");
  const reverse = await findPath(deal.slug, seller.slug);
  check(
    reverse !== null &&
      reverse.hops === 2 &&
      reverse.steps.every((step) => step.direction === "<-"),
    "findPath traverses edges undirected (2 hops, both reversed)",
  );
  const capped = await findPath(deal.slug, seller.slug, 1);
  check(capped === null, "findPath respects maxHops");

  const timeline = await getTimeline(deal.slug);
  check(
    timeline.length === 1 && timeline[0]?.audienceChannels.join(",") === "distressed",
    "getTimeline returns the fact chronologically with channels",
  );

  const deleted = await cleanup();
  check(deleted === 4, `cleanup removed all cli-test entities (${deleted})`);
  const leftover = await db
    .select({ id: entities.id })
    .from(entities)
    .where(like(entities.slug, "cli-test-%"));
  check(leftover.length === 0, "no cli-test rows remain");

  if (failures > 0) {
    console.error(`\nverify-cli: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-cli: PASS — all repository and normalization checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

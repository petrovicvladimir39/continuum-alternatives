import "./env";
import { eq, inArray, like, or } from "drizzle-orm";
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
import { createEdge } from "./repo/edges";
import { createEntity } from "./repo/entities";
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

async function cleanup() {
  const rows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(like(entities.slug, "cli-test-review-%"));
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
  console.log("— review workflow (proposed → approved) —");
  await cleanup();

  const alpha = await createEntity({ kind: "organization", name: "CLI Test Review Alpha" });
  const beta = await createEntity({ kind: "organization", name: "CLI Test Review Beta" });

  const edgeId = await createEdge({
    edgeType: "invested_in",
    sourceSlug: alpha.slug,
    targetSlug: beta.slug,
    confidence: "0.65",
    status: "proposed",
  });
  const factId = await addFact({
    entitySlug: alpha.slug,
    factType: "test_review",
    occurredOn: "2026-03-01",
    title: "CLI test proposed fact",
    channels: ["distressed"],
    confidence: "0.65",
    status: "proposed",
  });

  const beforeApproval = await findPath(alpha.slug, beta.slug);
  check(beforeApproval === null, "findPath does NOT traverse a proposed edge");
  const factsBefore = await getTimeline(alpha.slug);
  check(factsBefore[0]?.status === "proposed", "fact starts as proposed");

  // Mimic the /admin/review approve actions: direct status flips.
  await db
    .update(edges)
    .set({ status: "approved", verifiedBy: "verify-admin" })
    .where(eq(edges.id, edgeId));
  await db.update(timelineFacts).set({ status: "approved" }).where(eq(timelineFacts.id, factId));

  const afterApproval = await findPath(alpha.slug, beta.slug);
  check(
    afterApproval !== null && afterApproval.hops === 1,
    "findPath traverses the edge once approved",
  );
  const factsAfter = await getTimeline(alpha.slug);
  check(factsAfter[0]?.status === "approved", "fact status flipped to approved");

  const removed = await cleanup();
  check(removed === 2, `cleanup removed review fixtures (${removed})`);

  if (failures > 0) {
    console.error(`\nverify-admin: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-admin: PASS — review workflow checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

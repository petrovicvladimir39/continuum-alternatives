import "./env";
import { eq, inArray, like, or } from "drizzle-orm";
import { db } from "./client";
import {
  aliases,
  deals,
  documents,
  edges,
  edgeType,
  entities,
  entityTags,
  fundVehicles,
  organizations,
  people,
  sources,
  timelineFacts,
} from "./schema";
import { createEntity } from "./repo/entities";
import { createEdge } from "./repo/edges";
import {
  EDGE_PHRASES,
  getPublicProfile,
  getSimilar,
  publicPathFor,
  searchPublic,
} from "./repo/public";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

async function cleanup(): Promise<number> {
  const rows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(like(entities.slug, "cli-test-%"));
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
    await db.delete(fundVehicles).where(inArray(fundVehicles.entityId, ids));
    await db.delete(deals).where(inArray(deals.entityId, ids));
    await db.delete(people).where(inArray(people.entityId, ids));
    await db.delete(entities).where(inArray(entities.id, ids));
  }
  const docRows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(like(documents.title, "CLI Test Public%"));
  if (docRows.length > 0) {
    await db.delete(documents).where(
      inArray(
        documents.id,
        docRows.map((row) => row.id),
      ),
    );
  }
  await db.delete(sources).where(like(sources.name, "CLI Test Public%"));
  return ids.length;
}

/** Synthetic unit vector in the (0,1)-plane of a 1024-dim space — fixture only, no Voyage calls. */
function syntheticVector(angle: number): number[] {
  const vector = new Array<number>(1024).fill(0);
  vector[0] = Math.cos(angle);
  vector[1] = Math.sin(angle);
  return vector;
}

async function setEmbedding(entityId: string, angle: number) {
  await db
    .update(entities)
    .set({
      embedding: syntheticVector(angle),
      embeddingModel: "cli-test-synthetic",
      embeddedAt: new Date(),
    })
    .where(eq(entities.id, entityId));
}

async function main() {
  const removed = await cleanup();
  if (removed > 0) {
    console.log(`(cleaned ${removed} leftover cli-test entities first)`);
  }

  console.log("— edge direction phrasing map —");
  for (const type of edgeType.enumValues) {
    const phrase = EDGE_PHRASES[type];
    check(
      phrase !== undefined && phrase.out.length > 0 && phrase.in.length > 0,
      `EDGE_PHRASES covers ${type} in both directions`,
    );
  }

  console.log("\n— public path routing —");
  check(publicPathFor("organization", "x") === "/companies/x", "organization → /companies");
  check(publicPathFor("fund_vehicle", "x") === "/funds/x", "fund_vehicle → /funds");
  check(publicPathFor("deal", "x") === "/deals/x", "deal → /deals");
  check(publicPathFor("person", "x") === null, "person has NO public path (GDPR)");
  check(publicPathFor("asset", "x") === null, "asset has no public path");
  check(publicPathFor("event", "x") === null, "event has no public path");

  console.log("\n— fixtures —");
  const alpha = await createEntity({
    kind: "organization",
    name: "CLI Test Public Alpha d.o.o.",
    country: "RS",
    tags: ["servicer"],
    summary: "Fixture servicer for verify-public.",
  });
  const beta = await createEntity({
    kind: "organization",
    name: "CLI Test Public Beta",
    country: "RS",
  });
  await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, beta.id));
  const gamma = await createEntity({
    kind: "organization",
    name: "CLI Test Public Gamma",
    country: "RS",
  });
  const fund = await createEntity({ kind: "fund_vehicle", name: "CLI Test Public Fund I" });
  await db.insert(fundVehicles).values({ entityId: fund.id, managerEntityId: alpha.id });
  const deal = await createEntity({ kind: "deal", name: "CLI Test Public Deal 2020" });
  await db.insert(deals).values({ entityId: deal.id, dealType: "npl_sale" });
  const person = await createEntity({ kind: "person", name: "CLI Test Public Person" });

  const sourceRows = await db
    .insert(sources)
    .values({ name: "CLI Test Public Source", url: "https://example.com", sourceType: "press" })
    .returning({ id: sources.id });
  const sourceId = sourceRows[0]?.id;
  if (sourceId === undefined) {
    throw new Error("source fixture insert failed");
  }
  const docRows = await db
    .insert(documents)
    .values({
      sourceId,
      url: "https://example.com/article-1",
      title: "CLI Test Public Article",
    })
    .returning({ id: documents.id });
  const documentId = docRows[0]?.id;
  if (documentId === undefined) {
    throw new Error("document fixture insert failed");
  }

  await db.insert(timelineFacts).values([
    {
      entityId: alpha.id,
      factType: "press_mention",
      occurredOn: "2019-05-01",
      title: "Alpha cited fact",
      audienceChannels: ["distressed"],
      sourceDocumentId: documentId,
      status: "approved",
    },
    {
      entityId: alpha.id,
      factType: "press_mention",
      occurredOn: "2021-01-15",
      title: "Alpha uncited fact",
      status: "approved",
    },
    {
      entityId: alpha.id,
      factType: "press_mention",
      occurredOn: "2022-03-01",
      title: "Alpha proposed fact",
      status: "proposed",
    },
    {
      entityId: deal.id,
      factType: "deal_announced",
      occurredOn: "2020-06-01",
      title: "Deal announced",
      status: "approved",
      data: { amountText: "25.000.000,00" },
    },
  ]);

  await createEdge({ edgeType: "invested_in", sourceSlug: alpha.slug, targetSlug: gamma.slug });
  await createEdge({ edgeType: "serviced_by", sourceSlug: gamma.slug, targetSlug: alpha.slug });
  await createEdge({
    edgeType: "employed_by",
    sourceSlug: person.slug,
    targetSlug: alpha.slug,
  });
  await createEdge({
    edgeType: "lent_to",
    sourceSlug: alpha.slug,
    targetSlug: gamma.slug,
    status: "proposed",
  });
  console.log("seeded fixture entities, facts, edges");

  console.log("\n— profile assembly —");
  const profile = await getPublicProfile(alpha.slug, "organization");
  check(profile !== null, "active organization resolves a profile");
  if (profile !== null) {
    check(profile.facts.length === 2, `approved facts only (got ${profile.facts.length})`);
    check(
      profile.facts[0]?.occurredOn === "2019-05-01" && profile.facts[1]?.occurredOn === "2021-01-15",
      "facts are chronological",
    );
    check(profile.firstSeenYear === 2019, `first-seen year from earliest fact (got ${profile.firstSeenYear})`);
    const cited = profile.facts[0];
    check(
      cited?.citation !== null &&
        cited?.citation.sourceName === "CLI Test Public Source" &&
        cited?.citation.url === "https://example.com/article-1",
      "citation joins source name + document url",
    );
    check(profile.facts[1]?.citation === null, "fact without document has null citation");
    check(profile.tags.includes("servicer"), "tags load");

    check(profile.connections.length === 3, `approved edges only (got ${profile.connections.length})`);
    const invested = profile.connections.find((c) => c.edgeType === "invested_in");
    check(
      invested?.direction === "out" && invested.phrase === EDGE_PHRASES.invested_in.out,
      "outgoing edge uses source-side phrasing",
    );
    check(
      invested?.counterpartHref === `/companies/${gamma.slug}`,
      "active counterpart links to its public page",
    );
    const serviced = profile.connections.find((c) => c.edgeType === "serviced_by");
    check(
      serviced?.direction === "in" && serviced.phrase === EDGE_PHRASES.serviced_by.in,
      "incoming edge uses target-side phrasing",
    );
    const employed = profile.connections.find((c) => c.edgeType === "employed_by");
    check(
      employed !== undefined && employed.counterpartHref === null,
      "person counterpart renders unlinked (no public person pages)",
    );
  }

  check(
    (await getPublicProfile(beta.slug, "organization")) === null,
    "provisional entity yields null (404)",
  );
  check(
    (await getPublicProfile(alpha.slug, "deal")) === null,
    "kind mismatch yields null (deal route rejects org slug)",
  );
  check(
    (await getPublicProfile("cli-test-does-not-exist", "organization")) === null,
    "unknown slug yields null",
  );

  const fundProfile = await getPublicProfile(fund.slug, "fund_vehicle");
  check(
    fundProfile?.fund?.managerName === alpha.name &&
      fundProfile?.fund?.managerHref === `/companies/${alpha.slug}`,
    "fund profile carries manager name + link",
  );

  const dealProfile = await getPublicProfile(deal.slug, "deal");
  check(
    dealProfile?.deal?.amount === null && dealProfile?.dealAmountRaw === "25.000.000,00",
    "unparsed deal amount surfaces as raw text verbatim",
  );

  console.log("\n— similar entities (synthetic vectors) —");
  await setEmbedding(alpha.id, 0);
  await setEmbedding(gamma.id, 0.1);
  await setEmbedding(fund.id, 0.05);
  await setEmbedding(deal.id, 0.3);
  await setEmbedding(beta.id, 0.01); // provisional — must never surface
  await setEmbedding(person.id, 0.01); // person — must never surface

  const similar = await getSimilar(alpha.id, 3);
  const slugs = similar.map((hit) => hit.slug);
  check(!slugs.includes(alpha.slug), "similar excludes self");
  check(!slugs.includes(beta.slug), "similar excludes provisional entities");
  check(!slugs.includes(person.slug), "similar excludes people");
  check(slugs[0] === gamma.slug, `same-kind neighbor ranks first (got ${slugs[0] ?? "none"})`);
  check(
    slugs[1] === fund.slug && slugs[2] === deal.slug,
    `cross-kind fill by distance (got ${slugs.slice(1).join(", ")})`,
  );
  const noEmbedding = await createEntity({ kind: "organization", name: "CLI Test Public NoVec" });
  check(
    (await getSimilar(noEmbedding.id)).length === 0,
    "entity without embedding yields empty similar set",
  );

  console.log("\n— public search merge/dedup —");
  const textOnly = await searchPublic("CLI Test Public");
  check(
    textOnly.some((hit) => hit.slug === alpha.slug && hit.match === "text"),
    "ILIKE leg finds active entities",
  );
  check(
    !textOnly.some((hit) => hit.slug === beta.slug),
    "provisional entities never surface in search",
  );
  check(
    !textOnly.some((hit) => hit.slug === person.slug),
    "people never surface in search",
  );

  const merged = await searchPublic("CLI Test Public Alpha", syntheticVector(0.02));
  const alphaHits = merged.filter((hit) => hit.slug === alpha.slug);
  check(alphaHits.length === 1, "text + semantic hits dedupe by entity");
  check(alphaHits[0]?.match === "text", "ILIKE hit ranks before its semantic duplicate");
  check(
    merged.some((hit) => hit.slug === gamma.slug && hit.match === "semantic"),
    "semantic leg contributes non-text matches",
  );
  const firstSemantic = merged.findIndex((hit) => hit.match === "semantic");
  const lastText = merged.map((hit) => hit.match).lastIndexOf("text");
  check(
    firstSemantic === -1 || lastText < firstSemantic,
    "all ILIKE matches precede semantic matches",
  );
  check((await searchPublic("   ")).length === 0, "blank query returns nothing");

  console.log("\n— cleanup —");
  const deleted = await cleanup();
  check(deleted === 7, `cleanup removed all fixtures (${deleted})`);

  if (failures > 0) {
    console.error(`\nverify-public: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-public: PASS — public profiles, similar, and search green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

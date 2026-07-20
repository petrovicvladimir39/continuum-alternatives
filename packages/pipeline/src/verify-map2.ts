import "./env";
import {
  aggregateCities,
  capitalTypesFor,
  db,
  dominantOf,
  entities,
  entityTags,
  eq,
  getMapEntityCard,
  getPublicProfile,
  getRelated,
  inArray,
  like,
  or,
  sql,
  timelineFacts,
  aliases,
  documents,
  edges,
  organizations,
  sources,
} from "@continuum/db";
import { createEdge, createEntity } from "@continuum/db";
import { monogramFor, stripBaseLabels } from "@continuum/shared";
import { normalizeCityName } from "./geocode";
import { resolveLogo } from "./logos";

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
    .where(like(entities.slug, "cli-test-map2-%"));
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
  const docRows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(like(documents.title, "CLI Test Map2%"));
  if (docRows.length > 0) {
    await db.delete(documents).where(
      inArray(
        documents.id,
        docRows.map((row) => row.id),
      ),
    );
  }
  await db.delete(sources).where(like(sources.name, "CLI Test Map2%"));
  return ids.length;
}

async function main() {
  const removed = await cleanup();
  if (removed > 0) {
    console.log(`(cleaned ${removed} leftover cli-test-map2 entities first)`);
  }

  console.log("— city aggregation (pure) —");
  const cities = aggregateCities([
    { id: "1", country: "RS", city: "Београд", lat: 44.81253, lng: 20.46123, dominantType: "distressed" },
    { id: "2", country: "RS", city: "Belgrade", lat: 44.81257, lng: 20.46108, dominantType: "neutral" },
    { id: "3", country: "RS", city: "Београд", lat: 44.81253, lng: 20.46123, dominantType: "neutral" },
    { id: "4", country: "HR", city: "Zagreb", lat: 45.813, lng: 15.977, dominantType: "equity" },
    { id: "5", country: "RS", city: "Novi Sad", lat: 45.267, lng: 19.833, dominantType: "credit" },
  ]);
  check(cities.length === 3, `rounded-coord grouping yields 3 cities (got ${cities.length})`);
  const belgrade = cities[0];
  check(belgrade?.count === 3, "largest city first (Belgrade, 3 members)");
  check(belgrade?.city === "Beograd", `most-frequent spelling transliterated (got ${belgrade?.city})`);
  check(
    belgrade?.capitalTypeCounts.neutral === 2 && belgrade?.capitalTypeCounts.distressed === 1,
    "capitalTypeCounts aggregate per dominant type",
  );
  check(belgrade?.dominant === "distressed", "city dominant = dominant non-neutral type");
  check(
    belgrade?.entityIds.length === 3 && belgrade.entityIds.includes("2"),
    "entityIds carried per city",
  );

  console.log("\n— dominance rules (pure, Phase 17: non-neutral preferred) —");
  check(
    dominantOf({ equity: 2, credit: 2, distressed: 0, neutral: 0 }) === "credit",
    "tie breaks credit over equity",
  );
  check(
    dominantOf({ equity: 1, credit: 0, distressed: 1, neutral: 0 }) === "distressed",
    "tie breaks distressed first",
  );
  check(
    dominantOf({ equity: 0, credit: 0, distressed: 0, neutral: 1 }) === "neutral",
    "all-neutral city stays neutral",
  );
  check(
    dominantOf({ equity: 1, credit: 0, distressed: 0, neutral: 180 }) === "equity",
    "any non-neutral firm outranks the debtor mass (the Beograd rule)",
  );
  check(
    dominantOf({ equity: 2, credit: 3, distressed: 1, neutral: 181 }) === "credit",
    "dominant non-neutral wins among non-neutrals",
  );
  const dual = capitalTypesFor(["servicer", "bank"]);
  check(
    dual[0] === "distressed" && dual[1] === "credit",
    "capitalTypesFor orders equal matches by specialization",
  );
  check(capitalTypesFor([]).length === 0, "no mapped tags → no capital types (neutral)");

  console.log("\n— base-map label stripping (pure) —");
  const strippedStyle = stripBaseLabels({
    version: 8,
    layers: [
      { id: "water", type: "fill" },
      { id: "boundary_country", type: "line" },
      { id: "place_city", type: "symbol" },
      { id: "label_country_1", type: "symbol" },
      { id: "poi_label", type: "symbol" },
      { id: "road_label", type: "symbol" },
      { id: "water_name", type: "symbol" },
    ],
  });
  const keptIds = (strippedStyle.layers ?? []).map((layer) => layer.id);
  check(
    keptIds.includes("water") && keptIds.includes("boundary_country"),
    "fills and boundaries survive the label strip",
  );
  check(keptIds.includes("label_country_1"), "country labels survive");
  check(
    !keptIds.includes("place_city") && !keptIds.includes("poi_label") &&
      !keptIds.includes("road_label") && !keptIds.includes("water_name"),
    "place/POI/road/water labels are stripped",
  );

  console.log("\n— municipality normalization (pure) —");
  check(normalizeCityName("Београд – Стари Град") === "Београд", "dash suffix strips to Beograd");
  check(normalizeCityName("Стари Град") === "Београд", "bare municipality maps to Beograd");
  check(normalizeCityName("Novi Beograd") === "Београд", "Latin municipality maps to Beograd");
  check(normalizeCityName("Земун") === "Београд", "Cyrillic municipality maps to Beograd");
  check(normalizeCityName("Нови Сад") === "Нови Сад", "non-municipality city unchanged");
  check(
    normalizeCityName("Крагујевац - Центар") === "Крагујевац",
    "non-Belgrade suffix strips to the city",
  );

  console.log("\n— logo resolution + monogram (pure) —");
  check(
    resolveLogo("https://www.abriscapital.com/about") ===
      "https://www.google.com/s2/favicons?domain=www.abriscapital.com&sz=128",
    "resolveLogo builds the s2 favicon URL from the host",
  );
  check(resolveLogo(null) === null, "resolveLogo null website → null");
  check(resolveLogo("") === null, "resolveLogo empty website → null");
  check(resolveLogo("not a url") === null, "resolveLogo invalid website → null");
  check(monogramFor("Abris Capital") === "A", "monogram: latin first letter");
  check(monogramFor("ПИК ЗЕМУН") === "П", "monogram: Cyrillic kept");
  check(monogramFor("3TS Capital Partners") === "3", "monogram: digit allowed");
  check(monogramFor("«Đorđević»") === "Đ", "monogram: skips leading punctuation");
  check(monogramFor("—") === "•", "monogram: symbol-only name falls back to bullet");

  console.log("\n— fixtures —");
  const alpha = await createEntity({
    kind: "organization",
    name: "CLI Test Map2 Alpha",
    country: "RS",
    tags: ["servicer", "bank"],
  });
  const beta = await createEntity({
    kind: "organization",
    name: "CLI Test Map2 Beta",
    country: "RS",
    tags: ["gp_vc"],
  });
  const gamma = await createEntity({
    kind: "organization",
    name: "CLI Test Map2 Gamma",
    country: "RS",
  });
  // Geo for alpha + beta (same synthetic point → same-city relation testable).
  for (const id of [alpha.id, beta.id]) {
    await db.execute(
      sql`update entities set geo = ST_SetSRID(ST_MakePoint(20.9999, 44.9999), 4326)::geography where id = ${id}`,
    );
  }
  await db.insert(organizations).values({
    entityId: alpha.id,
    website: "https://cli-test-map2.example.com",
    logoUrl: resolveLogo("https://cli-test-map2.example.com"),
  });

  const sourceRows = await db
    .insert(sources)
    .values({ name: "CLI Test Map2 Source", url: "https://example.com", sourceType: "press" })
    .returning({ id: sources.id });
  const sourceId = sourceRows[0]?.id;
  if (sourceId === undefined) {
    throw new Error("source fixture insert failed");
  }
  const docRows = await db
    .insert(documents)
    .values({ sourceId, url: "https://example.com/map2-article", title: "CLI Test Map2 Article" })
    .returning({ id: documents.id });
  const documentId = docRows[0]?.id;
  if (documentId === undefined) {
    throw new Error("document fixture insert failed");
  }

  await db.insert(timelineFacts).values([
    {
      entityId: alpha.id,
      factType: "press_mention",
      occurredOn: "2020-01-10",
      title: "Alpha distressed-credit fact",
      audienceChannels: ["distressed", "private_credit"],
      sourceDocumentId: documentId,
      status: "approved",
    },
    {
      entityId: alpha.id,
      factType: "press_mention",
      occurredOn: "2022-02-02",
      title: "Alpha equity fact",
      audienceChannels: ["pe"],
      status: "approved",
    },
    {
      entityId: alpha.id,
      factType: "press_mention",
      occurredOn: "2023-03-03",
      title: "Alpha proposed fact",
      status: "proposed",
    },
  ]);

  await createEdge({ edgeType: "invested_in", sourceSlug: alpha.slug, targetSlug: beta.slug });
  await createEdge({ edgeType: "serviced_by", sourceSlug: beta.slug, targetSlug: alpha.slug });
  await createEdge({ edgeType: "lent_to", sourceSlug: alpha.slug, targetSlug: gamma.slug });
  await createEdge({ edgeType: "advised_on", sourceSlug: alpha.slug, targetSlug: beta.slug });
  console.log("seeded map2 fixtures");

  console.log("\n— profile stat computations —");
  const profile = await getPublicProfile(alpha.slug, "organization");
  check(profile !== null, "fixture profile resolves");
  if (profile !== null) {
    check(profile.factsCount === 2, `approved facts only (got ${profile.factsCount})`);
    check(profile.connectionsCount === 4, `connections count (got ${profile.connectionsCount})`);
    check(
      profile.counterpartiesCount === 2,
      `distinct counterparties (got ${profile.counterpartiesCount})`,
    );
    check(
      profile.latestActivityOn === "2022-02-02",
      `latest activity date (got ${profile.latestActivityOn})`,
    );
    check(
      profile.factSplit.distressed === 1 &&
        profile.factSplit.credit === 1 &&
        profile.factSplit.equity === 1,
      `channel fact split (got ${JSON.stringify(profile.factSplit)})`,
    );
    check(profile.mentions.length === 1, `one distinct source document (got ${profile.mentions.length})`);
    check(
      profile.mentions[0]?.sourceName === "CLI Test Map2 Source" &&
        profile.mentions[0]?.url === "https://example.com/map2-article" &&
        profile.mentions[0]?.date === "2020-01-10",
      "mention carries source name + url + first-referenced date",
    );
    check(
      profile.organization?.logoUrl ===
        "https://www.google.com/s2/favicons?domain=cli-test-map2.example.com&sz=128",
      "profile carries the resolved logo URL",
    );
  }

  console.log("\n— map entity card —");
  const card = await getMapEntityCard(alpha.id);
  check(card !== null, "entity card resolves for active entity");
  if (card !== null) {
    check(card.factsCount === 2 && card.connectionsCount === 4, "card stats match");
    check(card.latestFact?.title === "Alpha equity fact", "card latest fact is newest approved");
    check(card.connections.length === 3, `card caps connections at 3 (got ${card.connections.length})`);
    check(
      card.lines.length >= 1 && card.lines.every((line) => Number.isFinite(line.toLat)),
      "card lines carry geocoded counterparties",
    );
    check(card.href === `/companies/${alpha.slug}`, "card links to the full profile");
  }
  check((await getMapEntityCard(beta.id)) !== null, "beta card resolves");
  await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, gamma.id));
  check((await getMapEntityCard(gamma.id)) === null, "provisional entity yields no card");
  await db.update(entities).set({ status: "active" }).where(eq(entities.id, gamma.id));

  console.log("\n— related never-empty fallback —");
  const relatedGamma = await getRelated(gamma.id, 5);
  check(relatedGamma.length === 5, `tagless entity still gets 5 related (got ${relatedGamma.length})`);
  check(
    !relatedGamma.some((hit) => hit.id === gamma.id),
    "related excludes self",
  );
  const relatedAlpha = await getRelated(alpha.id, 5);
  check(relatedAlpha.length === 5, `fallback returns k rows (got ${relatedAlpha.length})`);
  check(
    relatedAlpha.some((hit) =>
      hit.tags.some((tag) => ["servicer", "bank", "collection_agency"].includes(tag)),
    ),
    "shared-tag ranking surfaces same-sector entities first",
  );

  console.log("\n— cleanup —");
  const deleted = await cleanup();
  check(deleted === 3, `cleanup removed all fixtures (${deleted})`);

  if (failures > 0) {
    console.error(`\nverify-map2: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-map2: PASS — city aggregation, logos, cards, and profile stats green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

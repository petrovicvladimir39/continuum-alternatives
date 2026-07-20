import "./env";
import {
  aliases,
  db,
  documents,
  entities,
  entityTags,
  eq,
  inArray,
  like,
  or,
  organizations,
  timelineFacts,
} from "@continuum/db";
import { createEntity } from "@continuum/db";
import { extractDocument } from "./extraction/extract";
import { mapFilingToFact } from "./filings-map";

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
  const docRows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(like(documents.url, "https://cli-test.invalid/%"));
  const docIds = docRows.map((row) => row.id);
  if (docIds.length > 0) {
    await db.delete(timelineFacts).where(inArray(timelineFacts.sourceDocumentId, docIds));
    await db.delete(documents).where(inArray(documents.id, docIds));
  }
  const entityRows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(or(like(entities.name, "CLI Test%"), like(entities.name, "CLI TEST%")));
  const ids = entityRows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(timelineFacts).where(inArray(timelineFacts.entityId, ids));
    await db.delete(entityTags).where(inArray(entityTags.entityId, ids));
    await db.delete(aliases).where(inArray(aliases.entityId, ids));
    await db.delete(organizations).where(inArray(organizations.entityId, ids));
    await db.delete(entities).where(inArray(entities.id, ids));
  }
}

async function insertFilingDoc(meta: Record<string, unknown>, suffix: string) {
  const inserted = await db
    .insert(documents)
    .values({
      url: `https://cli-test.invalid/filing/${suffix}`,
      title: String(meta.debtorName ?? "cli-test"),
      docType: "filing",
      contentText: "cli-test filing content",
      fetchedAt: new Date("2026-07-10T10:00:00Z"),
      meta,
    })
    .returning();
  const doc = inserted[0];
  if (!doc) {
    throw new Error("failed to insert fixture document");
  }
  return doc;
}

async function main() {
  console.log("— deterministic filings mapper —");
  await cleanup();

  // Matched path: entity with the matični broj already exists.
  const known = await createEntity({
    kind: "organization",
    name: "CLI TEST POZNATI DUŽNIK",
    country: "RS",
  });
  await db.insert(organizations).values({ entityId: known.id, registryId: "CLITEST-11111111" });

  const caseDoc = await insertFilingDoc(
    {
      listing: "alsu-stecajevi",
      debtorName: "CLI TEST POZNATI DUŽNIK",
      caseRef: "9. Ст. 99/2026",
      court: "Привредни суд у Београду",
      administrator: "Тест Управник",
      registryId: "CLITEST-11111111",
      city: "Београд",
      openedOn: "01.07.2026",
    },
    "case-1",
  );
  const caseMapped = await mapFilingToFact(caseDoc);
  check(caseMapped !== null, "case filing maps to a fact");
  check(caseMapped?.outcome === "matched", `matični broj resolves deterministically (matched)`);
  check(caseMapped?.entityId === known.id, "matched the pre-existing entity");
  const caseFact = (
    await db
      .select()
      .from(timelineFacts)
      .where(eq(timelineFacts.id, caseMapped?.factId ?? ""))
  )[0];
  check(caseFact?.factType === "insolvency_opened", "case fact_type insolvency_opened");
  check(
    caseFact?.title ===
      "Insolvency proceedings opened: CLI TEST POZNATI DUŽNIK (Привредни суд у Београду)",
    `case title with court ("${caseFact?.title}")`,
  );
  check(
    String(caseFact?.occurredOn) === "2026-07-01",
    `openedOn parsed (${String(caseFact?.occurredOn)})`,
  );
  check(caseFact?.audienceChannels.join(",") === "distressed", "case channels ['distressed']");
  check(caseFact?.confidence === "0.95", "case confidence 0.95");
  const caseData = (caseFact?.data ?? {}) as Record<string, unknown>;
  check(caseData.caseRef === "9. Ст. 99/2026", "case data carries caseRef raw");
  check(caseData.maticniBroj === "CLITEST-11111111", "case data carries matični broj raw");
  check(caseFact?.status === "proposed", "case fact lands proposed");

  // Idempotency.
  const refreshedCase = (await db.select().from(documents).where(eq(documents.id, caseDoc.id)))[0];
  check(
    (refreshedCase?.meta as Record<string, unknown>).mapped === true,
    "document stamped mapped=true",
  );
  const again = await mapFilingToFact(refreshedCase!);
  check(again === null, "second map call is a no-op (idempotent)");

  // Provisional path + amount parsing, including a non-numeric value.
  const saleDoc = await insertFilingDoc(
    {
      listing: "alsu-prodaje",
      debtorName: "CLI TEST NEPOZNATI DUŽNIK",
      saleMethod: "Јавно надметање",
      place: "Ниш",
      registryId: "CLITEST-22222222",
      estimatedValue: "12.345.678,90",
      startingPrice: "po dogovoru",
      saleDate: "15.08.2026",
    },
    "sale-1",
  );
  const saleMapped = await mapFilingToFact(saleDoc);
  check(
    saleMapped !== null && saleMapped.outcome === "provisional",
    "unknown debtor → provisional",
  );
  const provisionalEntity = (
    await db
      .select()
      .from(entities)
      .where(eq(entities.id, saleMapped?.entityId ?? ""))
  )[0];
  check(provisionalEntity?.status === "provisional", "created entity has status provisional");
  const orgDetail = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.entityId, saleMapped?.entityId ?? ""))
  )[0];
  check(orgDetail?.registryId === "CLITEST-22222222", "registryId stored on org detail");
  const saleFact = (
    await db
      .select()
      .from(timelineFacts)
      .where(eq(timelineFacts.id, saleMapped?.factId ?? ""))
  )[0];
  check(saleFact?.factType === "asset_sale_announced", "sale fact_type asset_sale_announced");
  check(
    saleFact?.audienceChannels.join(",") === "distressed,private_credit",
    "sale channels ['distressed','private_credit']",
  );
  check(String(saleFact?.occurredOn) === "2026-08-15", "saleDate parsed");
  const saleData = (saleFact?.data ?? {}) as Record<string, unknown>;
  check(saleData.estimatedValueText === "12.345.678,90", "estimatedValueText raw preserved");
  check(
    saleData.estimatedValue === 12345678.9,
    `numeric value parsed (${saleData.estimatedValue})`,
  );
  check(saleData.startingValueText === "po dogovoru", "non-numeric value text preserved raw");
  check(saleData.startingValue === null, '"po dogovoru" stays null — code never guesses');

  console.log("\n— extraction skip gate —");
  const skipResult = await extractDocument(caseDoc.id);
  check(
    skipResult.status === "skipped" && (skipResult.message ?? "").includes("deterministic mapper"),
    `ALSU filings never reach the paid extraction path (${skipResult.status})`,
  );

  await cleanup();
  const leftover = await db
    .select({ id: documents.id })
    .from(documents)
    .where(like(documents.url, "https://cli-test.invalid/%"));
  check(leftover.length === 0, "cleanup removed fixtures");

  if (failures > 0) {
    console.error(`\nverify-filings: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-filings: PASS — filings mapper checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

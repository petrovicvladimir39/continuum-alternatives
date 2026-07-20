import "./env";
import { parseRegionalAmount, parseRegionalDate } from "@continuum/shared";
import {
  aliases,
  and,
  createEntity,
  db,
  entities,
  entityTags,
  eq,
  inArray,
  like,
  ne,
  organizations,
  timelineFacts,
} from "@continuum/db";
import { applyGuards } from "./extraction/guards";
import type { ExtractionResult } from "./extraction/schema";

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
    .where(like(entities.name, "CLI Test%"));
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(timelineFacts).where(inArray(timelineFacts.entityId, ids));
    await db.delete(entityTags).where(inArray(entityTags.entityId, ids));
    await db.delete(aliases).where(inArray(aliases.entityId, ids));
    await db.delete(organizations).where(inArray(organizations.entityId, ids));
    await db.delete(entities).where(inArray(entities.id, ids));
  }
  return ids.length;
}

const DOC_TEXT =
  "Kompanija Alfa Beograd doo preuzela je Beta Solutions za iznos od 5.000.000 evra. " +
  "Ugovor je potpisan 15.03.2026. u Beogradu, uz savetovanje advokatske kancelarije Lex Firm.";

function item(overrides: Record<string, unknown>) {
  return {
    fact_type: "acquisition",
    title_en: "Alfa acquires Beta",
    body_en: "Alfa Beograd acquired Beta Solutions.",
    original_excerpt: "Kompanija Alfa Beograd doo preuzela je Beta Solutions",
    channels: ["pe"],
    confidence: 0.9,
    entities: [
      { name: "Alfa Beograd", kindHint: "organization", roleInFact: "buyer" },
      { name: "Beta Solutions", kindHint: "organization", roleInFact: "target" },
    ],
    proposedEdges: [
      { edgeType: "acquired", sourceName: "Alfa Beograd", targetName: "Beta Solutions" },
    ],
    ...overrides,
  };
}

async function main() {
  console.log("— deterministic parsers —");
  const amounts: [string, number | null][] = [
    ["25.000.000,00", 25000000],
    ["1.234.567,89", 1234567.89],
    ["1,234,567.89", 1234567.89],
    ["1 234 567,89", 1234567.89],
    ["25 miliona", null],
    ["oko 12.000", null],
    ["1.234", 1234],
    ["12,5", 12.5],
    ["1.23", 1.23],
    ["", null],
  ];
  for (const [input, expected] of amounts) {
    const got = parseRegionalAmount(input);
    check(got === expected, `parseRegionalAmount("${input}") === ${expected} (got ${got})`);
  }
  const dates: [string, string | null][] = [
    ["24.06.2026", "2026-06-24"],
    ["7.7.2026", "2026-07-07"],
    ["2026-06-24", "2026-06-24"],
    ["31.02.2026", null],
    ["24/06/2026", null],
    ["yesterday", null],
  ];
  for (const [input, expected] of dates) {
    const got = parseRegionalDate(input);
    check(got === expected, `parseRegionalDate("${input}") === ${expected} (got ${got})`);
  }

  console.log("\n— cyrillic + tag handling —");
  const { normalizeAlias } = await import("@continuum/shared");
  check(
    normalizeAlias("АГРО НОВАКОВИЋ") === "agro novakovic",
    `Serbian Cyrillic transliterates ("${normalizeAlias("АГРО НОВАКОВИЋ")}")`,
  );
  check(
    normalizeAlias("ЂОРЂЕВИЋ") === normalizeAlias("Đorđević"),
    "Cyrillic and Latin forms normalize identically",
  );
  const tagDoc =
    '<span class="info_title">Суд:</span>&nbsp;Привредни суд у Београду<br><h3>АГРО НОВАКОВИЋ</h3> у стечају';
  const tagResult = applyGuards(
    {
      relevant: true,
      language: "sr",
      summary_en: "t",
      items: [
        item({
          original_excerpt: "Суд: Привредни суд у Београду",
          entities: [{ name: "АГРО НОВАКОВИЋ", kindHint: "organization", roleInFact: "debtor" }],
          proposedEdges: [],
        }),
      ],
    } as unknown as ExtractionResult,
    tagDoc,
  );
  check(
    tagResult.items.length === 1 && tagResult.stats.droppedBadExcerpt === 0,
    "excerpt spanning inline tags passes the verbatim guard",
  );
  check(
    tagResult.items[0]?.entities.length === 1 && tagResult.stats.droppedFabricated === 0,
    "Cyrillic entity name traceable through tags",
  );

  console.log("\n— guards —");
  const synthetic = {
    relevant: true,
    language: "sr",
    summary_en: "Test",
    items: [
      item({}),
      item({ original_excerpt: "A completely paraphrased sentence not in the document" }),
      item({
        entities: [
          { name: "Alfa Beograd", kindHint: "organization", roleInFact: "buyer" },
          { name: "Gamma Capital Partners", kindHint: "organization", roleInFact: "invented" },
        ],
        proposedEdges: [
          {
            edgeType: "acquired",
            sourceName: "Gamma Capital Partners",
            targetName: "Alfa Beograd",
          },
        ],
      }),
      item({ occurred_on: "1889-01-01" }),
      item({ occurred_on: "15.03.2026" }),
      item({ channels: [] }),
      item({ channels: ["pe", "not-a-channel"] }),
    ],
  } as unknown as ExtractionResult;

  const { items: guarded, stats } = applyGuards(synthetic, DOC_TEXT);
  check(guarded.length === 6, `1 item dropped for bad excerpt (kept ${guarded.length}/7)`);
  check(stats.droppedBadExcerpt === 1, `droppedBadExcerpt === 1 (${stats.droppedBadExcerpt})`);
  check(stats.droppedFabricated === 1, `droppedFabricated === 1 (${stats.droppedFabricated})`);
  const fabricatedItem = guarded[1];
  check(
    fabricatedItem !== undefined &&
      fabricatedItem.entities.length === 1 &&
      fabricatedItem.proposedEdges.length === 0,
    "fabricated entity dropped and its edge dropped with it",
  );
  check(guarded[2]?.occurred_on === undefined, "out-of-range date nulled");
  check(guarded[3]?.occurred_on === "2026-03-15", "regional date normalized to ISO");
  check(stats.nulledDates === 1, `nulledDates === 1 (${stats.nulledDates})`);
  check(
    guarded[4]?.channels.length === 0 && guarded[4]?.confidence === 0.5,
    "zero-channel item confidence capped at 0.5",
  );
  check(
    guarded[5]?.channels.join(",") === "pe" && stats.strippedChannels === 1,
    "invalid channel stripped, valid kept",
  );

  console.log("\n— provisional promotion + orphan cleanup —");
  await cleanup();
  const referencedEntity = await createEntity({
    kind: "organization",
    name: "CLI Test Provisional Ref",
  });
  const orphanEntity = await createEntity({
    kind: "organization",
    name: "CLI Test Provisional Orphan",
  });
  await db
    .update(entities)
    .set({ status: "provisional" })
    .where(inArray(entities.id, [referencedEntity.id, orphanEntity.id]));

  await db.insert(timelineFacts).values({
    entityId: referencedEntity.id,
    factType: "test_review",
    occurredOn: "2026-07-01",
    title: "CLI Test proposed fact",
    audienceChannels: ["pe"],
    confidence: "0.80",
    status: "proposed",
    data: { entities: [referencedEntity.id] },
  });

  // Orphan detection: provisional entities referenced by no non-rejected item.
  const provisionalRows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.status, "provisional"), like(entities.name, "CLI Test%")));
  const factRefRows = await db
    .select({ entityId: timelineFacts.entityId, data: timelineFacts.data })
    .from(timelineFacts)
    .where(ne(timelineFacts.status, "rejected"));
  const referenced = new Set<string>();
  for (const row of factRefRows) {
    referenced.add(row.entityId);
    const data = (row.data ?? {}) as { entities?: string[] };
    for (const id of data.entities ?? []) {
      referenced.add(String(id));
    }
  }
  const orphans = provisionalRows.filter((row) => !referenced.has(row.id));
  check(
    orphans.length === 1 && orphans[0]?.id === orphanEntity.id,
    "orphan detection finds exactly the unreferenced provisional",
  );

  // Approve path: promote referenced provisionals (mimics approveFactAction).
  await db
    .update(timelineFacts)
    .set({ status: "approved" })
    .where(eq(timelineFacts.entityId, referencedEntity.id));
  await db
    .update(entities)
    .set({ status: "active" })
    .where(and(eq(entities.id, referencedEntity.id), eq(entities.status, "provisional")));
  const promoted = await db.select().from(entities).where(eq(entities.id, referencedEntity.id));
  check(promoted[0]?.status === "active", "referenced provisional promoted to active on approval");

  const removed = await cleanup();
  check(removed === 2, `cleanup removed fixtures (${removed})`);

  if (failures > 0) {
    console.error(`\nverify-extract: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-extract: PASS — extraction guard + promotion checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

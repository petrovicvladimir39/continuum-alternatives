import "./env";
import { companyNameCore } from "@continuum/shared";
import { eq, inArray, like, or } from "drizzle-orm";
import { db } from "./client";
import { aliases, edges, entities, entityTags, organizations, timelineFacts } from "./schema";
import { createEntity } from "./repo/entities";
import { backfillCoreAliases, resolveEntity } from "./resolve";

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
  await db.delete(entities).where(inArray(entities.id, ids));
  return ids.length;
}

const CORE_FIXTURES: [string, string][] = [
  ["Adriatic Capital Partners d.o.o. Beograd", "adriatic capital partners"],
  ["Banka Intesa a.d. Novi Sad", "banka intesa"],
  ["Novi Sad Agro Holding a.d.", "novi sad agro holding"],
  ["Đorđević & Partneri d.o.o.", "djordjevic partneri"],
  ["Țiriac Imobiliare S.R.L.", "tiriac imobiliare"],
  ["Sofia Asset Management OOD", "sofia asset management"],
  ["Krakow Advisory Sp. z o.o.", "krakow advisory"],
  ["Dalmatia Yachting Ltd", "dalmatia yachting"],
  ["Balkanski Industrii EOOD", "balkanski industrii"],
  ["Plain Name Consulting", "plain name consulting"],
];

type Fixture = { name: string; country: string; registryId?: string };

const FIXTURES: Fixture[] = [
  { name: "Đorđević & Partneri d.o.o.", country: "RS", registryId: "CLITEST-RS-901" },
  { name: "Banka Intesa a.d. Beograd", country: "RS", registryId: "CLITEST-RS-902" },
  { name: "Zagrebačka Nekretnine d.o.o.", country: "HR", registryId: "CLITEST-HR-903" },
  { name: "Jadranski Fond Kapitala d.d.", country: "HR", registryId: "CLITEST-HR-904" },
  { name: "Țiriac Imobiliare S.R.L.", country: "RO", registryId: "CLITEST-RO-905" },
  { name: "București Credit Recovery S.A.", country: "RO", registryId: "CLITEST-RO-906" },
  { name: "Sofia Asset Management OOD", country: "BG", registryId: "CLITEST-BG-907" },
  { name: "Balkanski Industrii EOOD", country: "BG", registryId: "CLITEST-BG-908" },
  { name: "Novi Sad Agro Holding a.d.", country: "RS" },
  { name: "Šumadija Servis d.o.o.", country: "RS" },
  { name: "Dalmatia Yachting Ltd", country: "HR" },
  { name: "Cluj Tech Ventures S.R.L.", country: "RO" },
];

type Candidate = {
  name: string;
  country?: string;
  registryId?: string;
  expect: "det" | "variant" | "new";
  truth?: string; // fixture name
  note?: string;
};

const CANDIDATES: Candidate[] = [
  // — deterministic (8): registry id must win regardless of name noise —
  {
    name: "Djordjevic Partners LLC",
    registryId: "CLITEST-RS-901",
    expect: "det",
    truth: FIXTURES[0]?.name ?? "",
  },
  {
    name: "Intesa Banka",
    registryId: "CLITEST-RS-902",
    expect: "det",
    truth: FIXTURES[1]?.name ?? "",
  },
  {
    name: "Zagrebacka Nekretnine",
    registryId: "CLITEST-HR-903",
    expect: "det",
    truth: FIXTURES[2]?.name ?? "",
  },
  {
    name: "Jadranski Fond",
    registryId: "CLITEST-HR-904",
    expect: "det",
    truth: FIXTURES[3]?.name ?? "",
  },
  {
    name: "Tiriac Imobiliare Group",
    registryId: "CLITEST-RO-905",
    expect: "det",
    truth: FIXTURES[4]?.name ?? "",
  },
  {
    name: "Bucharest Credit Recovery",
    registryId: "CLITEST-RO-906",
    expect: "det",
    truth: FIXTURES[5]?.name ?? "",
  },
  { name: "Sofia AM", registryId: "CLITEST-BG-907", expect: "det", truth: FIXTURES[6]?.name ?? "" },
  {
    name: "Balkanski Industrii AD",
    registryId: "CLITEST-BG-908",
    expect: "det",
    truth: FIXTURES[7]?.name ?? "",
  },
  // — true variants (30) —
  {
    name: "Đorđević & Partneri d.o.o.",
    country: "RS",
    expect: "variant",
    truth: FIXTURES[0]?.name ?? "",
  },
  {
    name: "Djordjevic & Partneri d.o.o. Beograd",
    country: "RS",
    expect: "variant",
    truth: FIXTURES[0]?.name ?? "",
  },
  { name: "Đorđević i Partneri", expect: "variant", truth: FIXTURES[0]?.name ?? "" },
  { name: "Banka Intesa AD", country: "RS", expect: "variant", truth: FIXTURES[1]?.name ?? "" },
  {
    name: "Banka Intesa d.d. Novi Sad",
    country: "HR",
    expect: "variant",
    truth: FIXTURES[1]?.name ?? "",
    note: "country-mismatch cap",
  },
  {
    name: "Banka Inteza a.d.",
    country: "RS",
    expect: "variant",
    truth: FIXTURES[1]?.name ?? "",
    note: "hard typo",
  },
  {
    name: "Zagrebacka Nekretnine",
    country: "HR",
    expect: "variant",
    truth: FIXTURES[2]?.name ?? "",
  },
  { name: "Zagrebačka  Nekretnine   d.o.o.", expect: "variant", truth: FIXTURES[2]?.name ?? "" },
  {
    name: "Zagrebacka Nekretnine j.d.o.o.",
    country: "HR",
    expect: "variant",
    truth: FIXTURES[2]?.name ?? "",
  },
  {
    name: "Jadranski Fond Kapitala",
    country: "HR",
    expect: "variant",
    truth: FIXTURES[3]?.name ?? "",
  },
  { name: "Jadranski fond kapitala d.o.o.", expect: "variant", truth: FIXTURES[3]?.name ?? "" },
  {
    name: "Jadranski Fond Capitala d.d.",
    country: "HR",
    expect: "variant",
    truth: FIXTURES[3]?.name ?? "",
  },
  { name: "Tiriac Imobiliare", country: "RO", expect: "variant", truth: FIXTURES[4]?.name ?? "" },
  { name: "Țiriac Imobiliare S.A.", expect: "variant", truth: FIXTURES[4]?.name ?? "" },
  {
    name: "Tiriac Imobiliare S.R.L. Bucuresti",
    country: "RO",
    expect: "variant",
    truth: FIXTURES[4]?.name ?? "",
  },
  {
    name: "Bucuresti Credit Recovery",
    country: "RO",
    expect: "variant",
    truth: FIXTURES[5]?.name ?? "",
  },
  { name: "Bucuresti Credit Recovery S.R.L.", expect: "variant", truth: FIXTURES[5]?.name ?? "" },
  {
    name: "Bucuresti Credit Recovery Group",
    country: "RO",
    expect: "variant",
    truth: FIXTURES[5]?.name ?? "",
  },
  {
    name: "Sofia Asset Management",
    country: "BG",
    expect: "variant",
    truth: FIXTURES[6]?.name ?? "",
  },
  { name: "Sofia Asset Management EAD", expect: "variant", truth: FIXTURES[6]?.name ?? "" },
  {
    name: "Sofia Aset Management OOD",
    country: "BG",
    expect: "variant",
    truth: FIXTURES[6]?.name ?? "",
    note: "typo",
  },
  { name: "Balkanski Industrii", country: "BG", expect: "variant", truth: FIXTURES[7]?.name ?? "" },
  { name: "Balkanski Industrii OOD", expect: "variant", truth: FIXTURES[7]?.name ?? "" },
  {
    name: "Novi Sad Agro Holding",
    country: "RS",
    expect: "variant",
    truth: FIXTURES[8]?.name ?? "",
  },
  { name: "Novi Sad Agro-Holding a.d.", expect: "variant", truth: FIXTURES[8]?.name ?? "" },
  { name: "Šumadija Servis", country: "RS", expect: "variant", truth: FIXTURES[9]?.name ?? "" },
  { name: "Sumadija Servis d.o.o. Kragujevac", expect: "variant", truth: FIXTURES[9]?.name ?? "" },
  { name: "Dalmatia Yachting", country: "HR", expect: "variant", truth: FIXTURES[10]?.name ?? "" },
  { name: "Dalmatia Yachting d.o.o.", expect: "variant", truth: FIXTURES[10]?.name ?? "" },
  {
    name: "Cluj Tech Ventures LLC",
    country: "RO",
    expect: "variant",
    truth: FIXTURES[11]?.name ?? "",
  },
  // — genuinely new (12): must NEVER resolve matched —
  { name: "Adriatic Capital Management", expect: "new" },
  { name: "Panonska Banka a.d.", country: "RS", expect: "new" },
  { name: "Zagreb Capital Partners d.o.o.", country: "HR", expect: "new" },
  { name: "Beogradska Pekara doo", country: "RS", expect: "new" },
  { name: "Karpaty Credit Union", expect: "new" },
  { name: "Thracian Estates EOOD", country: "BG", expect: "new" },
  { name: "Ljubljanska Mlekarna d.d.", expect: "new" },
  { name: "Danube Shipping & Logistics Kft", country: "HU", expect: "new" },
  { name: "Sofia Aset Grupa", country: "BG", expect: "new" },
  { name: "Intesa Leasing d.o.o. Beograd", country: "RS", expect: "new" },
  { name: "Novi Beograd Holding a.d.", country: "RS", expect: "new" },
  { name: "Cluj Technology Transfer Office SRL", country: "RO", expect: "new" },
];

async function main() {
  console.log("— companyNameCore fixtures —");
  for (const [input, expected] of CORE_FIXTURES) {
    const got = companyNameCore(input);
    check(
      got === expected,
      `core("${input}") === "${expected}"${got === expected ? "" : ` (got "${got}")`}`,
    );
  }

  console.log("\n— resolution benchmark —");
  const removed = await cleanup();
  if (removed > 0) {
    console.log(`(cleaned ${removed} leftover cli-test entities first)`);
  }

  const idByName = new Map<string, string>();
  for (const fixture of FIXTURES) {
    const entity = await createEntity({
      kind: "organization",
      name: fixture.name,
      country: fixture.country,
    });
    await db
      .update(entities)
      .set({ slug: `cli-test-${entity.slug}` })
      .where(eq(entities.id, entity.id));
    await db.insert(organizations).values({
      entityId: entity.id,
      ...(fixture.registryId !== undefined ? { registryId: fixture.registryId } : {}),
    });
    idByName.set(fixture.name, entity.id);
  }
  console.log(`seeded ${FIXTURES.length} fixture organizations`);

  const backfilled = await backfillCoreAliases();
  console.log(`backfillCoreAliases inserted ${backfilled} core alias rows`);

  let falseMerges = 0;
  let detHits = 0;
  let variantHits = 0;
  let variantTotal = 0;
  let newViolations = 0;
  const table: string[][] = [];

  for (const candidate of CANDIDATES) {
    const result = await resolveEntity({
      name: candidate.name,
      kindHint: "organization",
      ...(candidate.country !== undefined ? { country: candidate.country } : {}),
      ...(candidate.registryId !== undefined ? { registryId: candidate.registryId } : {}),
    });
    const truthId = candidate.truth !== undefined ? idByName.get(candidate.truth) : undefined;
    const bestScore = result.candidates[0]?.score;
    let verdict: string;

    if (candidate.expect === "det") {
      const pass =
        result.outcome === "matched" && result.via === "registry_id" && result.entityId === truthId;
      if (pass) {
        detHits += 1;
      }
      if (result.outcome === "matched" && result.entityId !== truthId) {
        falseMerges += 1;
      }
      verdict = pass ? "PASS" : "FAIL";
    } else if (candidate.expect === "variant") {
      variantTotal += 1;
      if (result.outcome === "matched" && result.entityId !== truthId) {
        falseMerges += 1;
        verdict = "FALSE-MERGE";
      } else if (
        (result.outcome === "matched" && result.entityId === truthId) ||
        (result.outcome === "ambiguous" && result.candidates.some((c) => c.entityId === truthId))
      ) {
        variantHits += 1;
        verdict = "PASS";
      } else {
        verdict = "MISS";
      }
    } else {
      if (result.outcome === "matched") {
        newViolations += 1;
        falseMerges += 1;
        verdict = "FALSE-MERGE";
      } else {
        verdict = "PASS";
      }
    }
    table.push([
      candidate.name,
      candidate.expect,
      result.outcome,
      result.via ?? "",
      bestScore !== undefined ? bestScore.toFixed(3) : "",
      verdict + (candidate.note ? ` (${candidate.note})` : ""),
    ]);
  }

  const widths = [42, 8, 10, 12, 7, 24];
  const header = ["candidate", "expect", "outcome", "via", "score", "verdict"];
  console.log("\n" + header.map((h, i) => h.padEnd(widths[i] ?? 0)).join(" "));
  console.log(widths.map((w) => "-".repeat(w)).join(" "));
  for (const row of table) {
    console.log(row.map((c, i) => (c ?? "").slice(0, widths[i]).padEnd(widths[i] ?? 0)).join(" "));
  }

  const variantRate = variantHits / variantTotal;
  console.log(
    `\nscores: deterministic ${detHits}/8 · variants ${variantHits}/${variantTotal} (${(variantRate * 100).toFixed(1)}%) · false merges ${falseMerges} · new-matched violations ${newViolations}`,
  );

  check(falseMerges === 0, "zero false merges");
  check(detHits === 8, "all registry-id candidates matched via deterministic");
  check(
    variantRate >= 0.9,
    `>=90% of true variants matched or ambiguous-with-truth (${(variantRate * 100).toFixed(1)}%)`,
  );
  check(newViolations === 0, "no genuinely-new candidate resolved matched");

  const countryCap = await resolveEntity({
    name: "Banka Intesa d.d. Novi Sad",
    country: "HR",
    kindHint: "organization",
  });
  check(
    countryCap.outcome === "ambiguous",
    `country mismatch caps a perfect-score match at ambiguous (got ${countryCap.outcome})`,
  );

  const deleted = await cleanup();
  check(deleted === FIXTURES.length, `cleanup removed all fixtures (${deleted})`);

  if (failures > 0) {
    console.error(`\nverify-resolve: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-resolve: PASS — resolution benchmark green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

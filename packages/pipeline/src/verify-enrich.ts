import "./env";
import { applyEnrichmentGuards, enrichmentSchema, proposedFieldsOf } from "./enrich";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

// Fixture "site text" with planted values. Deterministic — no fetches, no API.
const SITE_TEXT = `Adriatic Example Partners is an independent investment firm.
Founded in 1998, the firm manages capital for institutional investors.
Our office: Bulevar kralja Aleksandra 15, 11000 Belgrade, Serbia.
We are a team of 25 professionals across three offices.
Assets under management: EUR 450 million as of 2025.`;

function main() {
  console.log("— schema contract —");
  const valid = enrichmentSchema.safeParse({
    overview_en:
      "Adriatic Example Partners is an independent investment firm managing institutional capital.",
    founded_year: 1998,
    hq_address: "Bulevar kralja Aleksandra 15, 11000 Belgrade",
    team_size_text: "a team of 25 professionals",
    strategy_focus: ["buyouts", "growth equity"],
    aum_text: "EUR 450 million",
    source_urls: ["https://example.com"],
  });
  check(valid.success, "well-formed record passes the schema");
  check(
    !enrichmentSchema.safeParse({ overview_en: "too short", source_urls: [] }).success,
    "short overview + empty sources rejected",
  );

  console.log("\n— mechanical guards: planted values KEEP —");
  if (!valid.success) {
    throw new Error("fixture record must validate");
  }
  const kept = applyEnrichmentGuards(valid.data, SITE_TEXT);
  check(kept.proposed.founded_year === 1998, "founded_year kept (4-digit string present)");
  check(
    kept.proposed.hq_address === "Bulevar kralja Aleksandra 15, 11000 Belgrade",
    "hq_address kept (substring-normalized match)",
  );
  check(
    kept.proposed.team_size_text === "a team of 25 professionals",
    "team_size_text kept (verbatim substring)",
  );
  check(kept.proposed.aum_text === "EUR 450 million", "aum_text kept (verbatim substring)");
  check(
    kept.guardStats.droppedFoundedYear === 0 &&
      kept.guardStats.droppedHqAddress === 0 &&
      kept.guardStats.droppedTeamSize === 0 &&
      kept.guardStats.droppedAum === 0,
    "no drops counted when everything grounds",
  );
  check(kept.overview_en.length > 0 && kept.source_urls.length === 1, "overview + sources pass through");

  console.log("\n— mechanical guards: absent values DROP —");
  const fabricated = applyEnrichmentGuards(
    {
      overview_en: "Adriatic Example Partners is an independent investment firm in the region.",
      founded_year: 2003, // not in text
      hq_address: "Terazije 1, Belgrade", // not in text
      team_size_text: "a team of 40 experts", // not verbatim
      aum_text: "EUR 1.2 billion", // not verbatim
      source_urls: ["https://example.com"],
    },
    SITE_TEXT,
  );
  check(fabricated.proposed.founded_year === undefined, "ungrounded founded_year dropped");
  check(fabricated.proposed.hq_address === undefined, "ungrounded hq_address dropped");
  check(fabricated.proposed.team_size_text === undefined, "paraphrased team_size_text dropped");
  check(fabricated.proposed.aum_text === undefined, "computed aum_text dropped");
  check(
    fabricated.guardStats.droppedFoundedYear === 1 &&
      fabricated.guardStats.droppedHqAddress === 1 &&
      fabricated.guardStats.droppedTeamSize === 1 &&
      fabricated.guardStats.droppedAum === 1,
    "every drop counted",
  );
  check(
    fabricated.overview_en.length > 0,
    "overview survives guard failures (it is labeled + sourced, not a factual claim)",
  );

  console.log("\n— guard nuances —");
  const diacritics = applyEnrichmentGuards(
    {
      overview_en: "The firm operates from its Belgrade headquarters serving regional clients.",
      hq_address: "Bulevar Kralja Aleksandra 15", // case differs; normalizeAlias evens it
      source_urls: ["https://example.com"],
    },
    SITE_TEXT,
  );
  check(
    diacritics.proposed.hq_address === "Bulevar Kralja Aleksandra 15",
    "address guard is normalization-tolerant (case/diacritics)",
  );
  const partialYear = applyEnrichmentGuards(
    {
      overview_en: "The firm manages institutional capital across the Adriatic region since 1998.",
      founded_year: 1990, // "1990" not in text even though "1998" is
      source_urls: ["https://example.com"],
    },
    SITE_TEXT,
  );
  check(partialYear.proposed.founded_year === undefined, "wrong year is not excused by a similar one");

  console.log("\n— review-queue grouping —");
  const fields = proposedFieldsOf({
    proposed: { founded_year: 1998, hq_address: "X", aum_text: "Y" },
  });
  check(
    fields.length === 3 && fields.includes("founded_year") && fields.includes("aum_text"),
    "one org with 3 proposed fields → ONE grouped item listing 3 fields",
  );
  check(proposedFieldsOf({ proposed: {} }).length === 0, "empty proposal → no queue item");
  check(proposedFieldsOf(null).length === 0, "null enrichment → no queue item");
  check(proposedFieldsOf({}).length === 0, "missing proposed key → no queue item");

  if (failures > 0) {
    console.error(`\nverify-enrich: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-enrich: PASS — enrichment guards and grouping green");
}

main();

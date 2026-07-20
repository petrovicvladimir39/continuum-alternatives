import "./env";
import { db, documents, sql } from "@continuum/db";
import { notifyQueue, pendingCounts } from "./alert";
import { mapFilingToFact } from "./filings-map";

/**
 * Maps all existing unmapped ALSU filings into proposed facts. Idempotent via
 * documents.meta.mapped = true; safe to re-run any time.
 */
async function main() {
  const rows = await db
    .select()
    .from(documents)
    .where(
      sql`${documents.meta}->>'listing' LIKE 'alsu-%' AND coalesce(${documents.meta}->>'mapped', '') <> 'true'`,
    );
  console.log(`unmapped ALSU filings: ${rows.length}`);

  let mapped = 0;
  let matched = 0;
  let provisional = 0;
  let skipped = 0;
  for (const doc of rows) {
    const result = await mapFilingToFact(doc);
    if (result === null) {
      skipped += 1;
      continue;
    }
    mapped += 1;
    if (result.outcome === "matched") {
      matched += 1;
    } else {
      provisional += 1;
    }
  }
  console.log(
    `mapped ${mapped} filings into proposed facts (entities: ${matched} matched, ${provisional} provisional) · skipped ${skipped}`,
  );
  if (mapped > 0) {
    await notifyQueue(await pendingCounts());
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

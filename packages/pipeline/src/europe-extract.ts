import "./env";
import { db, sql } from "@continuum/db";
import { extractDocument } from "./extraction/extract";
import { countryBudgetLeft, loadLedger, printLedger, saveLedger } from "./europe-depth";

/**
 * EUROPE DEPTH RUN — Step-3 press extraction under the COUNTRY sub-budget
 * ($0.45) and the run-wide EUROPE_DEPTH_CAP, one persistent ledger across
 * all countries (data/europe-depth-ledger.json).
 *
 *   tsx src/europe-extract.ts --country DE [--days 14]
 *
 * Same doctrine as mega-extract: relevance-gated extractor, all facts land
 * PROPOSED, stop CLEANLY the moment the ledger hits either cap and log the
 * backlog. Sonnet: $3/M input, $15/M output.
 */

const IN_PER_M = 3;
const OUT_PER_M = 15;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const ccIdx = argv.indexOf("--country");
  const cc = ccIdx >= 0 ? argv[ccIdx + 1]?.toUpperCase() : undefined;
  if (cc === undefined) {
    console.error("usage: europe-extract.ts --country CC [--days 14]");
    process.exit(1);
  }
  const daysIdx = argv.indexOf("--days");
  const days = daysIdx >= 0 ? Number.parseInt(argv[daysIdx + 1] ?? "14", 10) : 14;

  const ledger = loadLedger();
  const budget = countryBudgetLeft(ledger, cc);
  if (budget <= 0) {
    console.log(`europe-extract ${cc}: no budget left (country or total cap) — nothing done`);
    process.exit(0);
  }

  const candidates = await db.execute(sql`
    SELECT d.id, d.title, s.name AS source_name
    FROM documents d
    JOIN sources s ON s.id = d.source_id
    WHERE s.country = ${cc}
      AND s.source_type IN ('press','company_site')
      AND coalesce(d.meta->'extraction'->>'status','') = ''
      AND coalesce(d.meta->>'needsOcr','') <> 'true'
      AND length(coalesce(d.content_text,'')) > 500
      AND d.fetched_at > now() - make_interval(days => ${days})
    ORDER BY d.fetched_at DESC
  `);
  const fetched = candidates.rows as { id: string; title: string; source_name: string }[];
  // Round-robin by source so one high-volume generalist feed cannot
  // monopolize the sub-budget (DE lesson: tagesschau ate 3 slots on
  // irrelevant items while specialist feeds waited).
  const bySource = new Map<string, typeof fetched>();
  for (const row of fetched) {
    const list = bySource.get(row.source_name) ?? [];
    list.push(row);
    bySource.set(row.source_name, list);
  }
  const rows: typeof fetched = [];
  for (let i = 0; rows.length < fetched.length; i++) {
    for (const list of bySource.values()) {
      const item = list[i];
      if (item !== undefined) {
        rows.push(item);
      }
    }
  }
  console.log(
    `europe-extract ${cc}: ${rows.length} candidates (last ${days}d, ${bySource.size} sources round-robin) · budget $${budget.toFixed(3)}`,
  );

  let spent = 0;
  let processed = 0;
  let facts = 0;
  let done = 0;
  let irrelevant = 0;
  let errors = 0;
  for (const row of rows) {
    if (spent >= budget) {
      break;
    }
    try {
      const result = await extractDocument(row.id);
      processed += 1;
      if (result.usage !== undefined) {
        spent += (result.usage.inputTokens * IN_PER_M + result.usage.outputTokens * OUT_PER_M) / 1e6;
      }
      if (result.status === "done") {
        done += 1;
        facts += result.factsStored;
      } else if (result.status === "irrelevant") {
        irrelevant += 1;
      }
      console.log(
        `  [$${spent.toFixed(3)}] ${result.status} · ${row.source_name} · ${(row.title ?? "").slice(0, 70)}`,
      );
    } catch (error) {
      errors += 1;
      console.log(`  ERROR ${row.source_name}: ${String(error).slice(0, 120)}`);
    }
  }
  const backlog = rows.length - processed;

  // Persist spend + backlog on the one run ledger (re-read to stay fresh).
  const after = loadLedger();
  after.spent[cc] = (after.spent[cc] ?? 0) + spent;
  if (backlog > 0) {
    after.backlog[cc] = `${backlog} unextracted documents (last ${days}d) at sub-budget stop`;
  }
  saveLedger(after);

  console.log(
    `\neurope-extract ${cc}: processed ${processed} (relevant ${done}, irrelevant ${irrelevant}, errors ${errors}) · ${facts} facts PROPOSED · backlog ${backlog}`,
  );
  printLedger(after);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

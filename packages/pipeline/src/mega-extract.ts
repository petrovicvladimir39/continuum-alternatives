import "./env";
import { db, sql } from "@continuum/db";
import { extractDocument } from "./extraction/extract";

/**
 * CLEAN-100 Part 5 — press extraction under a HARD dollar cap.
 *
 *   MEGA_LLM_CAP=6 pnpm --filter @continuum/pipeline exec tsx src/mega-extract.ts [--days 14] [--dry-run]
 *
 * Selects unextracted press/newsroom documents fetched in the last N days
 * (newest first), runs the existing relevance-gated extractor (facts land
 * PROPOSED, review-queue doctrine unchanged), and STOPS CLEANLY the moment
 * the running ledger reaches the cap. Sonnet 4.6: $3/M input, $15/M output.
 */

const CAP_USD = Number.parseFloat(process.env.MEGA_LLM_CAP ?? "6");
const IN_PER_M = 3;
const OUT_PER_M = 15;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const daysIdx = argv.indexOf("--days");
  const days = daysIdx >= 0 ? Number.parseInt(argv[daysIdx + 1] ?? "14", 10) : 14;
  const dryRun = argv.includes("--dry-run");

  const candidates = await db.execute(sql`
    SELECT d.id, d.title, s.name AS source_name, length(coalesce(d.content_text,'')) AS chars
    FROM documents d
    JOIN sources s ON s.id = d.source_id
    WHERE s.source_type IN ('press','company_site')
      AND coalesce(d.meta->'extraction'->>'status','') = ''
      AND coalesce(d.meta->>'needsOcr','') <> 'true'
      AND length(coalesce(d.content_text,'')) > 500
      AND d.fetched_at > now() - make_interval(days => ${days})
    ORDER BY d.fetched_at DESC
  `);
  const rows = candidates.rows as { id: string; title: string; source_name: string; chars: number }[];
  console.log(`mega-extract: ${rows.length} candidate documents (last ${days}d) · cap $${CAP_USD.toFixed(2)}`);
  if (dryRun) {
    for (const row of rows.slice(0, 40)) {
      console.log(`  ${row.source_name} · ${(row.title ?? "").slice(0, 80)} (${row.chars} chars)`);
    }
    process.exit(0);
  }

  let spent = 0;
  let done = 0;
  let irrelevant = 0;
  let errors = 0;
  let facts = 0;
  let processed = 0;
  for (const row of rows) {
    if (spent >= CAP_USD) {
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
  console.log(
    `\nmega-extract done: processed ${processed} (relevant ${done}, irrelevant ${irrelevant}, errors ${errors}) · ${facts} facts PROPOSED` +
      `\n  spend $${spent.toFixed(3)} of $${CAP_USD.toFixed(2)} cap · backlog remaining ${backlog} documents`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

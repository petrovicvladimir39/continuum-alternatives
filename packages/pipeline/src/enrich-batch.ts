import "./env";
import { db, sql } from "@continuum/db";
import { enrichOrganization, type EnrichmentGuardStats } from "./enrich";

/**
 * Enrichment batch runner (Phase 17D). --limit is REQUIRED — enrichment never
 * runs unbounded. Costs are tracked per call at claude-sonnet-4-6 list prices
 * ($3/M input, $15/M output) with a HARD ABORT at $3.00 total.
 */

const INPUT_PER_M = 3.0;
const OUTPUT_PER_M = 15.0;
const HARD_CAP_USD = Number.parseFloat(process.env.MEGA_ENRICH_CAP ?? "3.0");

function parseLimit(): number {
  const index = process.argv.indexOf("--limit");
  const value = index === -1 ? undefined : process.argv[index + 1];
  const limit = value === undefined ? NaN : Number.parseInt(value, 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    console.error("usage: pnpm enrich:batch -- --limit <n>   (the flag is required)");
    process.exit(1);
  }
  return limit;
}

async function main() {
  const limit = parseLimit();
  const started = Date.now();

  // The N most-connected/most-documented active curated orgs (website + logo),
  // not yet enriched — re-running skips anything already carrying enrichment.
  const result = await db.execute(sql`
    select e.id, e.name,
      (select count(*)::int from edges ed
        where ed.status = 'approved'
          and (ed.source_entity_id = e.id or ed.target_entity_id = e.id)) as connections,
      (select count(*)::int from timeline_facts tf
        where tf.entity_id = e.id and tf.status = 'approved') as facts
    from entities e
    join organizations o on o.entity_id = e.id
    where e.status = 'active' and e.kind = 'organization'
      and o.website is not null
      and o.enrichment is null
      -- any activity signal: an edge in either review state, or an approved fact
      and (exists(select 1 from edges ed where ed.source_entity_id = e.id or ed.target_entity_id = e.id)
        or exists(select 1 from timeline_facts tf where tf.entity_id = e.id))
    order by (
      (select count(*) from edges ed
        where ed.status = 'approved'
          and (ed.source_entity_id = e.id or ed.target_entity_id = e.id))
      + (select count(*) from timeline_facts tf
          where tf.entity_id = e.id and tf.status = 'approved')
    ) desc, e.name
    limit ${limit}
  `);

  console.log(`enrich-batch: ${result.rows.length} candidates (limit ${limit})\n`);

  let inputTokens = 0;
  let outputTokens = 0;
  let done = 0;
  let empty = 0;
  let failed = 0;
  let firecrawlCalls = 0;
  let queueItems = 0;
  const totalGuards: EnrichmentGuardStats = {
    droppedFoundedYear: 0,
    droppedHqAddress: 0,
    droppedTeamSize: 0,
    droppedAum: 0,
  };
  const keptFields: Record<string, number> = {
    founded_year: 0,
    hq_address: 0,
    team_size_text: 0,
    aum_text: 0,
  };

  const costNow = () => (inputTokens / 1e6) * INPUT_PER_M + (outputTokens / 1e6) * OUTPUT_PER_M;

  for (const row of result.rows) {
    if (costNow() >= HARD_CAP_USD) {
      console.error(
        `\nHARD ABORT: running cost $${costNow().toFixed(3)} reached the $${HARD_CAP_USD.toFixed(2)} cap after ${done + empty + failed} orgs`,
      );
      break;
    }
    const name = String(row.name);
    try {
      const outcome = await enrichOrganization(String(row.id));
      inputTokens += outcome.usage.inputTokens;
      outputTokens += outcome.usage.outputTokens;
      if (outcome.firecrawlUsed) {
        firecrawlCalls += 1;
      }
      if (outcome.status === "done") {
        done += 1;
        if (outcome.guardStats !== undefined) {
          totalGuards.droppedFoundedYear += outcome.guardStats.droppedFoundedYear;
          totalGuards.droppedHqAddress += outcome.guardStats.droppedHqAddress;
          totalGuards.droppedTeamSize += outcome.guardStats.droppedTeamSize;
          totalGuards.droppedAum += outcome.guardStats.droppedAum;
        }
        const fields = outcome.proposedFields ?? [];
        if (fields.length > 0) {
          queueItems += 1;
          for (const field of fields) {
            keptFields[field] = (keptFields[field] ?? 0) + 1;
          }
        }
        console.log(
          `done  ${name} — ${fields.length > 0 ? `proposed: ${fields.join(", ")}` : "overview only"} · running cost $${costNow().toFixed(3)}`,
        );
      } else {
        empty += 1;
        console.log(`empty ${name} (${outcome.message ?? outcome.status})`);
      }
    } catch (error) {
      failed += 1;
      console.error(`fail  ${name}: ${String(error).slice(0, 140)}`);
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\nenrich-batch report`);
  console.log(`  enriched:            ${done}`);
  console.log(`  no site text:        ${empty}`);
  console.log(`  failed:              ${failed}`);
  console.log(`  firecrawl fallbacks: ${firecrawlCalls}`);
  console.log(`  review-queue items:  ${queueItems}`);
  console.log(
    `  fields kept:         founded ${keptFields.founded_year}, address ${keptFields.hq_address}, team ${keptFields.team_size_text}, aum ${keptFields.aum_text}`,
  );
  console.log(
    `  dropped by guard:    founded ${totalGuards.droppedFoundedYear}, address ${totalGuards.droppedHqAddress}, team ${totalGuards.droppedTeamSize}, aum ${totalGuards.droppedAum}`,
  );
  console.log(
    `  tokens:              ${inputTokens} in / ${outputTokens} out — cost $${costNow().toFixed(3)} (cap $${HARD_CAP_USD.toFixed(2)})`,
  );
  console.log(`  elapsed:             ${elapsed}s`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

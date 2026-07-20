import "./env";
import { db, documents, sources, sql } from "@continuum/db";
import { extractDocument } from "./extraction/extract";

/**
 * Targeted extraction batch (reset build Part 5) — LLM SPEND, operator-aimed.
 *
 *   pnpm extract:batch -- --source-type newsroom --limit 10 [--dry-run]
 *   pnpm extract:batch -- --source-type press --language de --limit 5
 *   pnpm extract:batch -- --source-id <uuid> --limit 20
 *
 * Selects UNextracted stored documents from a chosen structured slice —
 * never blanket. --limit is REQUIRED. --dry-run lists the selection and
 * its cost ceiling without calling the model. Source-type aliases:
 * "newsroom" = company_site sources linked to an entity (sources.entity_id).
 */

const COST_PER_DOC_CEILING = 0.03;

function arg(name: string): string | undefined {
  const argv = process.argv.slice(2);
  const index = argv.indexOf(`--${name}`);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value !== undefined && !value.startsWith("--") ? value : undefined;
}

async function main(): Promise<void> {
  const sourceType = arg("source-type");
  const sourceId = arg("source-id");
  const language = arg("language");
  const limitRaw = arg("limit");
  const dryRun = process.argv.includes("--dry-run");
  const limit = limitRaw !== undefined ? Number.parseInt(limitRaw, 10) : NaN;
  if (!Number.isFinite(limit) || limit <= 0) {
    console.error(
      "usage: pnpm extract:batch -- [--source-type newsroom|press|registry|…] [--source-id uuid] [--language xx] --limit N [--dry-run]\n" +
        "--limit is required: extraction spend is always aimed at a chosen slice, never blanket.",
    );
    process.exit(1);
  }

  const isNewsroom = sourceType === "newsroom";
  const result = await db.execute(sql`
    SELECT d.id, d.title, s.name AS source_name, length(coalesce(d.content_text,'')) AS chars
    FROM ${documents} d
    JOIN ${sources} s ON s.id = d.source_id
    WHERE coalesce(d.meta->'extraction'->>'status', '') <> 'done'
      AND length(coalesce(d.content_text, '')) > 500
      AND (${sourceId ?? null}::uuid IS NULL OR s.id = ${sourceId ?? null}::uuid)
      AND (${language ?? null}::text IS NULL OR d.language = ${language ?? null})
      AND (
        ${sourceType ?? null}::text IS NULL
        OR (${isNewsroom} AND s.source_type = 'company_site' AND s.entity_id IS NOT NULL)
        OR (NOT ${isNewsroom} AND s.source_type::text = ${sourceType ?? null})
      )
    ORDER BY d.fetched_at DESC NULLS LAST
    LIMIT ${limit}
  `);

  const rows = result.rows;
  console.log(
    `extract:batch — ${rows.length} unextracted documents selected` +
      `${sourceType !== undefined ? ` · source-type ${sourceType}` : ""}` +
      `${language !== undefined ? ` · language ${language}` : ""}` +
      ` · cost ceiling ~$${(rows.length * COST_PER_DOC_CEILING).toFixed(2)}`,
  );
  for (const row of rows) {
    console.log(`  ${String(row.id).slice(0, 8)} · ${row.source_name} · ${String(row.title ?? "").slice(0, 80)}`);
  }
  if (dryRun) {
    console.log("dry run — no extraction calls made.");
    process.exit(0);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set — cannot extract. Re-run with --dry-run to preview.");
    process.exit(1);
  }

  let done = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await extractDocument(String(row.id));
      done += 1;
    } catch (error) {
      failed += 1;
      console.error(`  extraction failed for ${String(row.id)}: ${String(error)}`);
    }
  }
  console.log(`extract:batch done — extracted ${done}, failed ${failed}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

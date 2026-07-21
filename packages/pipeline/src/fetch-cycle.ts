import "./env";
import { db, sources, sql } from "@continuum/db";
import { fetchSource } from "./fetch";

/**
 * CLEAN-100 Part 5 — one polite fetch cycle across all ACTIVE crawl sources,
 * without Inngest (not yet connected). $0 deterministic: fetching stores
 * documents; extraction is a separate, budgeted step.
 *
 *   pnpm --filter @continuum/pipeline exec tsx src/fetch-cycle.ts [--type press]
 *
 * Sequential by domain: sources sharing a hostname run consecutively with a
 * longer gap; distinct hosts get the base delay. One failure never kills the
 * cycle (fetchSource already records ingestion_runs + last_run_status).
 */

const BASE_DELAY_MS = 1200;
const SAME_HOST_DELAY_MS = 4000;

function hostOf(url: string | null): string {
  if (url === null) {
    return "";
  }
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const typeIndex = argv.indexOf("--type");
  const typeFilter = typeIndex >= 0 ? argv[typeIndex + 1] : undefined;

  const rows = await db
    .select({
      id: sources.id,
      name: sources.name,
      url: sources.url,
      sourceType: sources.sourceType,
      fetchMethod: sources.fetchMethod,
    })
    .from(sources)
    .where(
      sql`${sources.active} = true AND ${sources.fetchMethod} IN ('rss','newsletter_rss','firecrawl_index','http_simple')
          AND (${typeFilter ?? null}::text IS NULL OR ${sources.sourceType} = ${typeFilter ?? null})`,
    );

  // Group by host so same-domain sources run consecutively, politely spaced.
  rows.sort((a, b) => hostOf(a.url).localeCompare(hostOf(b.url)) || a.name.localeCompare(b.name));
  console.log(`fetch cycle: ${rows.length} active sources${typeFilter ? ` (type ${typeFilter})` : ""}`);

  let ok = 0;
  let failed = 0;
  let newDocs = 0;
  let prevHost = "";
  for (const [i, source] of rows.entries()) {
    const host = hostOf(source.url);
    await sleep(host !== "" && host === prevHost ? SAME_HOST_DELAY_MS : BASE_DELAY_MS);
    prevHost = host;
    try {
      const result = await fetchSource(source.id);
      const added = result.kind === "crawl" ? result.newArticles : 0;
      newDocs += added;
      ok += 1;
      console.log(
        `  [${i + 1}/${rows.length}] ${source.name}: ` +
          (result.kind === "crawl" ? `${added} new / ${result.itemsInFeed} in feed` : "fetched"),
      );
    } catch (error) {
      failed += 1;
      console.log(`  [${i + 1}/${rows.length}] ${source.name}: FAILED — ${String(error).slice(0, 140)}`);
    }
  }
  console.log(`cycle done: ${ok} ok, ${failed} failed, ${newDocs} new documents`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

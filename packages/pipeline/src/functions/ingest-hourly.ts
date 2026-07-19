import { db, eq, sources, sql } from "@continuum/db";
import { sendAlert } from "../alert";
import { fetchSource } from "../fetch";
import { inngest } from "../inngest";

/**
 * Runs at minute 7 of every hour. A source is due when it is active and:
 *   hourly — always; daily — last run older than 22h (or never run);
 *   weekly — last run older than 6.5 days (or never run).
 * Each source runs in its own step so one failure never kills the batch;
 * a source that still fails after Inngest's default retries triggers a
 * Telegram alert (scheduled runs only — manual runs never alert).
 */
export const ingestHourly = inngest.createFunction(
  { id: "ingest-hourly" },
  { cron: "7 * * * *" },
  async ({ step }) => {
    const due = await step.run("find-due-sources", async () => {
      const rows = await db
        .select({ id: sources.id, name: sources.name })
        .from(sources)
        .where(
          sql`${sources.active} = true AND (
            ${sources.schedule} = 'hourly'
            OR (${sources.schedule} = 'daily' AND (${sources.lastRunAt} IS NULL OR ${sources.lastRunAt} < now() - interval '22 hours'))
            OR (${sources.schedule} = 'weekly' AND (${sources.lastRunAt} IS NULL OR ${sources.lastRunAt} < now() - interval '6.5 days'))
          )`,
        );
      return rows;
    });

    const outcomes: Record<string, string> = {};
    for (const source of due) {
      try {
        const result = await step.run(`fetch-${source.id}`, () => fetchSource(source.id));
        outcomes[source.name] =
          result.kind === "crawl"
            ? `new ${result.newArticles}/${result.itemsInFeed}`
            : result.changed
              ? "changed"
              : "unchanged";
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        outcomes[source.name] = `error: ${message}`;
        await step.run(`alert-${source.id}`, () =>
          sendAlert(`⚠ source ${source.name} failed: ${message}`),
        );
      }
    }
    return { due: due.length, outcomes };
  },
);

/** Manual fetch requested from the admin UI. No alerting on failure. */
export const ingestSource = inngest.createFunction(
  { id: "ingest-source" },
  { event: "source/fetch.requested" },
  async ({ event, step }) => {
    const sourceId = String(event.data.sourceId);
    const exists = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.id, sourceId));
    if (exists.length === 0) {
      throw new Error(`Unknown source id: ${sourceId}`);
    }
    return step.run("fetch", () => fetchSource(sourceId));
  },
);

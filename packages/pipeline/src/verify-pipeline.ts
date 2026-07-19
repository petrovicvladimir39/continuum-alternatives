import "./env";
import { db, documents, eq, ingestionRuns, like, sources } from "@continuum/db";
import { sendAlert } from "./alert";
import { fetchSource } from "./fetch";

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
    .select({ id: sources.id })
    .from(sources)
    .where(like(sources.name, "CLI Test%"));
  for (const row of rows) {
    await db.delete(ingestionRuns).where(eq(ingestionRuns.sourceId, row.id));
    await db.delete(documents).where(eq(documents.sourceId, row.id));
    await db.delete(sources).where(eq(sources.id, row.id));
  }
  return rows.length;
}

async function main() {
  console.log("— ingestion framework (fetch + change detection) —");
  await cleanup();

  const inserted = await db
    .insert(sources)
    .values({
      name: "CLI Test Canary",
      url: "https://continuumalternatives.com",
      sourceType: "other",
      fetchMethod: "http_simple",
      schedule: "weekly",
      active: false,
    })
    .returning({ id: sources.id });
  const sourceId = inserted[0]?.id;
  if (!sourceId) {
    throw new Error("failed to insert test source");
  }

  const first = await fetchSource(sourceId);
  check(
    first.kind === "http_simple" && first.changed === true,
    `first fetch reports changed (${JSON.stringify(first)})`,
  );
  check(
    first.kind === "http_simple" && first.documentId !== undefined,
    "first fetch inserted a document",
  );

  const second = await fetchSource(sourceId);
  check(
    second.kind === "http_simple" && second.changed === false,
    "second fetch reports unchanged (hash skip)",
  );

  const docs = await db
    .select({ id: documents.id, title: documents.title, hash: documents.contentHash })
    .from(documents)
    .where(eq(documents.sourceId, sourceId));
  check(docs.length === 1, `exactly one documents row exists (got ${docs.length})`);
  check(
    docs[0]?.title !== null && docs[0] !== undefined && (docs[0].title ?? "").length > 0,
    `document title extracted ("${docs[0]?.title}")`,
  );

  await db
    .update(sources)
    .set({ url: "https://continuumalternatives.com/definitely-404-cli-test" })
    .where(eq(sources.id, sourceId));
  let threw = false;
  try {
    await fetchSource(sourceId);
  } catch (err) {
    threw = err instanceof Error && err.message.includes("404");
  }
  check(threw, "404 fetch throws with status in message");

  const runs = await db.select().from(ingestionRuns).where(eq(ingestionRuns.sourceId, sourceId));
  check(runs.length === 3, `three ingestion runs recorded (got ${runs.length})`);
  const okRuns = runs.filter((run) => run.status === "ok");
  const errorRuns = runs.filter((run) => run.status === "error");
  check(okRuns.length === 2, "two runs recorded status ok");
  check(
    errorRuns.length === 1 && (errorRuns[0]?.error ?? "").includes("404"),
    "error run recorded with error text",
  );
  const sourceRow = (await db.select().from(sources).where(eq(sources.id, sourceId)))[0];
  check(sourceRow?.lastRunStatus === "error", "sources.last_run_status updated to error");
  check(sourceRow?.lastRunAt !== null, "sources.last_run_at set");

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    let warned = "";
    const original = console.warn;
    console.warn = (msg: unknown) => {
      warned = String(msg);
    };
    await sendAlert("verify-pipeline test alert");
    console.warn = original;
    check(
      warned.includes("no-op") && warned.includes("verify-pipeline test alert"),
      "sendAlert no-ops with console.warn when telegram unset",
    );
  } else {
    console.log("(telegram configured — skipping no-op branch check)");
  }

  const removed = await cleanup();
  check(removed === 1, "cleanup removed the test source");

  if (failures > 0) {
    console.error(`\nverify-pipeline: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-pipeline: PASS — ingestion framework checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

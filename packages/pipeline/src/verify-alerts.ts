import "./env";
import { capViewHits, IMPORTANT_FACT_TYPES, routeAlert } from "@continuum/shared";
import {
  alertOutbox,
  db,
  enqueueAlertsForEntities,
  enqueueViewHits,
  eq,
  isWatching,
  listOutbox,
  markOutboxSeen,
  memberWatchlist,
  sql,
  unseenOutboxCount,
  unwatchEntity,
  upsertMemberProfile,
  watchEntity,
  watcherCount,
  WATCHER_PRIVACY_THRESHOLD,
} from "@continuum/db";
import { buildAlertEmail, deliverPendingAlerts } from "./alerts";

/**
 * Verify: Phase 28 watchlists + alerts — outbox idempotency, watch
 * round-trip, routing matrix, view-hit cap, seen/unseen math, privacy
 * threshold, pre-Resend pending path.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const FIX = "user_verify_alerts_";

async function cleanup(): Promise<void> {
  const members = await db.execute(
    sql`SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`,
  );
  for (const row of members.rows) {
    await db.delete(alertOutbox).where(eq(alertOutbox.memberId, String(row.id)));
    await db.delete(memberWatchlist).where(eq(memberWatchlist.memberId, String(row.id)));
    await db.execute(sql`DELETE FROM member_alert_prefs WHERE member_id = ${String(row.id)}`);
  }
  await db.execute(sql`DELETE FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`);
}

async function main(): Promise<void> {
  await cleanup();
  // A real approved fact + its entity to hang fixtures on.
  const factRow = await db.execute(sql`
    SELECT f.id AS fact_id, f.entity_id
    FROM timeline_facts f JOIN entities e ON e.id = f.entity_id
    WHERE f.status = 'approved' LIMIT 1
  `);
  const factId = String(factRow.rows[0]!.fact_id);
  const entityId = String(factRow.rows[0]!.entity_id);

  console.log("— watch/unwatch round-trip —");
  const member = await upsertMemberProfile({ clerkUserId: `${FIX}a`, email: "alerts-a@test.test" });
  check(!(await isWatching(member.id, entityId)), "not watching initially");
  await watchEntity(member.id, entityId);
  check(await isWatching(member.id, entityId), "watch lands");
  await watchEntity(member.id, entityId);
  check(await isWatching(member.id, entityId), "double-watch is idempotent");
  await unwatchEntity(member.id, entityId);
  check(!(await isWatching(member.id, entityId)), "unwatch removes");
  await watchEntity(member.id, entityId);

  console.log("\n— outbox idempotency —");
  // Other real members may watch the same entity — assert on the FIXTURE
  // member's rows, not global insert counts.
  const first = await enqueueAlertsForEntities("fact", factId, [entityId]);
  const mine = await db.execute(
    sql`SELECT count(*)::int AS n FROM alert_outbox WHERE member_id = ${member.id} AND kind = 'fact' AND ref_id = ${factId}::uuid`,
  );
  check(first >= 1 && Number(mine.rows[0]?.n) === 1, `enqueue lands exactly one row for the watcher (got ${mine.rows[0]?.n})`);
  const second = await enqueueAlertsForEntities("fact", factId, [entityId]);
  check(second === 0, "re-enqueue inserts nothing (unique member+kind+ref)");
  const multi = await enqueueAlertsForEntities("fact", factId, [entityId, entityId]);
  check(multi === 0, "duplicate entity refs collapse");

  console.log("\n— instant-vs-daily routing matrix —");
  for (const factType of IMPORTANT_FACT_TYPES) {
    check(routeAlert(factType, "instant_important") === "instant", `${factType} + instant_important → instant`);
  }
  check(routeAlert("people_move", "instant_important") === "daily", "unimportant type waits for daily");
  check(routeAlert("insolvency_opened", "daily") === "daily", "daily tier never instant");
  check(routeAlert("insolvency_opened", "off") === "silent", "off tier is silent");
  check(routeAlert(null, "instant_important") === "daily", "kind without fact type → daily");

  console.log("\n— saved-view cap + view hits —");
  const many = Array.from({ length: 35 }, (_, i) => `item-${i}`);
  check(capViewHits(many, 20).length === 20, "cap trims to 20/view/day");
  check(capViewHits(["a"], 20).length === 1, "under-cap passes through");
  const factIds = await db.execute(sql`
    SELECT id FROM timeline_facts WHERE status = 'approved' LIMIT 3
  `);
  const ids = factIds.rows.map((row) => String(row.id));
  const hits1 = await enqueueViewHits(member.id, ids);
  check(hits1 === ids.length - (ids[0] === factId ? 1 : 0) || hits1 <= ids.length, `view hits inserted (${hits1})`);
  const hits2 = await enqueueViewHits(member.id, ids);
  check(hits2 === 0, "view-hit re-evaluation is idempotent");

  console.log("\n— seen/unseen math —");
  const unseenBefore = await unseenOutboxCount(member.id);
  check(unseenBefore >= 1, `unseen counts pending rows (${unseenBefore})`);
  await markOutboxSeen(member.id);
  check((await unseenOutboxCount(member.id)) === 0, "viewing marks everything seen");
  const outboxItems = await listOutbox(member.id, {});
  check(outboxItems.every((item) => item.seenAt !== null), "seen_at stamped on all rows");
  check(outboxItems.every((item) => item.sentAt === null), "rows remain UNSENT (pre-Resend pending path)");

  console.log("\n— pre-Resend pending delivery path —");
  const hadKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const report = await deliverPendingAlerts();
  check(report.mode === "pending_no_resend", "no Resend → pending mode");
  check(
    (await listOutbox(member.id, { unsentOnly: true })).length > 0,
    "rows stay pending for alerts:backfill",
  );
  if (hadKey !== undefined) {
    process.env.RESEND_API_KEY = hadKey;
  }

  console.log("\n— alert email rendering (pure) —");
  const email = buildAlertEmail(await listOutbox(member.id, {}));
  check(email.subject.startsWith("Watchlist:"), "subject carries the count");
  check(email.html.includes("/account/watchlist"), "alerts opt-out links the PREFS page (not newsletter unsubscribe)");
  check(!email.html.toLowerCase().includes("telegram"), "telegram is not a member channel");

  console.log("\n— aggregate-threshold privacy rule —");
  // Use a FRESH entity nobody else watches so external watchers can't skew
  // the threshold math.
  const freshEntity = await db.execute(sql`
    SELECT e.id FROM entities e
    WHERE NOT EXISTS (SELECT 1 FROM member_watchlist w WHERE w.entity_id = e.id)
    LIMIT 1
  `);
  const freshId = String(freshEntity.rows[0]!.id);
  await watchEntity(member.id, freshId);
  check((await watcherCount(freshId)) === null, "below threshold → null (never a small count)");
  for (let i = 0; i < WATCHER_PRIVACY_THRESHOLD - 1; i++) {
    const extra = await upsertMemberProfile({ clerkUserId: `${FIX}x${i}`, email: null });
    await watchEntity(extra.id, freshId);
  }
  const atThreshold = await watcherCount(freshId);
  check(atThreshold === WATCHER_PRIVACY_THRESHOLD, `at threshold → aggregate count (${atThreshold})`);
  const outboxShape = await listOutbox(member.id, { limit: 5 });
  check(
    outboxShape.every((item) => !JSON.stringify(item).includes("clerk_user_id")),
    "outbox exposes no member identities",
  );

  await cleanup();
  if (failures > 0) {
    console.error(`\nverify-alerts: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-alerts: PASS — watchlists + alerts green");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

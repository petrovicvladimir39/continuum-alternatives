import "./env";
import { createHmac } from "node:crypto";
import Stripe from "stripe";
import {
  BRIEF_GLOBAL_DAILY_BUDGET_USD,
  BRIEF_MEMBER_MONTHLY_CAP,
  canAddWatch,
  canEnableViewAlert,
  canExport,
  canGenerateBrief,
  canUseFrequency,
  checkoutOpen,
  ENTITLEMENTS,
  EXPORTS_PER_DAY,
  foundingSeatsLeft,
  subscriptionSyncFromEvent,
  tierFromSubscription,
  type MemberTier,
} from "@continuum/shared";
import {
  briefCostTodayUsd,
  computeBriefDataVersion,
  countActiveFoundingSubscriptions,
  countAlertEnabledViews,
  countBriefGenerationsThisMonth,
  countExportsToday,
  countWatchedEntities,
  db,
  getBrief,
  getSubscription,
  logBriefGeneration,
  logExport,
  resolveMemberTier,
  sql,
  syncSubscriptionByStripeId,
  upsertBrief,
  upsertMemberProfile,
  upsertSubscription,
  watchEntity,
  unwatchEntity,
  type BriefContent,
} from "@continuum/db";
import type { ComposeInputs } from "./articles-guards";
import { guardBrief, INTERNAL_SOURCE_NAME } from "./brief-guards";

/**
 * Verify: Phase 29 — the free/paid line. Entitlement matrix, cap math incl.
 * downgrade behavior, Stripe webhook signature + status-sync fixtures,
 * seat-count truth, brief guards + cache invalidation + caps.
 *
 * Fixtures NEVER touch timeline_facts (append-only doctrine): cache
 * invalidation is proven through the EDGES leg of the fingerprint on
 * fixture entities that are created provisional and removed at the end.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const FIX = "user_verify_payments_";
const SLUG = "verify-payments-fixture-";

async function cleanup(): Promise<void> {
  const members = await db.execute(
    sql`SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`,
  );
  for (const row of members.rows) {
    const id = String(row.id);
    await db.execute(sql`DELETE FROM brief_generations WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_export_log WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_subscriptions WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_watchlist WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_saved_views WHERE member_id = ${id}`);
  }
  await db.execute(sql`
    DELETE FROM entity_briefs WHERE entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM brief_generations WHERE entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM edges WHERE source_entity_id IN
      (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`DELETE FROM entities WHERE slug LIKE ${SLUG + "%"}`);
  await db.execute(sql`DELETE FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`);
}

/** Stripe-format signature header (t=...,v1=hmac_sha256(secret, "t.payload")). */
function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function main(): Promise<void> {
  await cleanup();

  console.log("— entitlement matrix (anon / free / founding × every gate) —");
  const tiers: MemberTier[] = ["anon", "free", "founding"];
  const expected = {
    anon: { watchAt0: false, alertAt0: false, instant: false, exports: false, briefs: false },
    free: { watchAt0: true, alertAt0: true, instant: false, exports: false, briefs: false },
    founding: { watchAt0: true, alertAt0: true, instant: true, exports: true, briefs: true },
  } as const;
  for (const tier of tiers) {
    const want = expected[tier];
    check(canAddWatch(tier, 0) === want.watchAt0, `${tier}: add first watch → ${want.watchAt0}`);
    check(
      canEnableViewAlert(tier, 0) === want.alertAt0,
      `${tier}: enable first view alert → ${want.alertAt0}`,
    );
    check(
      canUseFrequency(tier, "instant_important") === want.instant,
      `${tier}: instant_important → ${want.instant}`,
    );
    check(canExport(tier) === want.exports, `${tier}: exports → ${want.exports}`);
    check(canGenerateBrief(tier) === want.briefs, `${tier}: briefs → ${want.briefs}`);
    check(canUseFrequency(tier, "off") === true, `${tier}: "off" always allowed`);
  }
  check(canAddWatch("free", 4) && !canAddWatch("free", 5), "free watch limit sits exactly at 5");
  check(
    canEnableViewAlert("free", 0) && !canEnableViewAlert("free", 1),
    "free alert-view limit sits exactly at 1",
  );
  check(canAddWatch("founding", 10_000), "founding watch is unlimited");
  check(ENTITLEMENTS.free.watchLimit === 5 && ENTITLEMENTS.free.alertViewLimit === 1, "published free limits are 5 / 1");

  console.log("\n— tier from subscription status —");
  check(tierFromSubscription(null) === "free", "no subscription → free");
  for (const status of ["active", "trialing", "past_due"]) {
    check(
      tierFromSubscription({ status, founding: true }) === "founding",
      `${status} + founding → founding`,
    );
  }
  for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
    check(tierFromSubscription({ status, founding: true }) === "free", `${status} → free`);
  }
  check(
    tierFromSubscription({ status: "active", founding: false }) === "free",
    "active NON-founding row does not grant the founding tier",
  );

  console.log("\n— seat-count truth + checkout gate —");
  const baseline = await countActiveFoundingSubscriptions();
  const seatA = await upsertMemberProfile({ clerkUserId: `${FIX}seat_a`, email: null });
  const seatB = await upsertMemberProfile({ clerkUserId: `${FIX}seat_b`, email: null });
  const seatC = await upsertMemberProfile({ clerkUserId: `${FIX}seat_c`, email: null });
  await upsertSubscription({
    memberId: seatA.id, stripeCustomerId: "cus_vp_a", stripeSubscriptionId: "sub_vp_a",
    status: "active", priceId: "price_vp", currentPeriodEnd: new Date(Date.now() + 86_400_000),
  });
  await upsertSubscription({
    memberId: seatB.id, stripeCustomerId: "cus_vp_b", stripeSubscriptionId: "sub_vp_b",
    status: "trialing", priceId: "price_vp", currentPeriodEnd: null,
  });
  await upsertSubscription({
    memberId: seatC.id, stripeCustomerId: "cus_vp_c", stripeSubscriptionId: "sub_vp_c",
    status: "canceled", priceId: "price_vp", currentPeriodEnd: null,
  });
  const counted = await countActiveFoundingSubscriptions();
  check(counted === baseline + 2, `active+trialing count, canceled does not (${baseline}→${counted})`);
  check(foundingSeatsLeft(100, 98) === 2 && foundingSeatsLeft(100, 100) === 0, "seatsLeft math");
  check(foundingSeatsLeft(100, 150) === 0, "seatsLeft never negative");
  check(checkoutOpen(100, 99) && !checkoutOpen(100, 100), "checkout closes exactly at the cap");

  console.log("\n— cap math incl. downgrade (over-limit goes READ-ONLY, never deleted) —");
  const member = await upsertMemberProfile({ clerkUserId: `${FIX}dg`, email: "vp@test.test" });
  await upsertSubscription({
    memberId: member.id, stripeCustomerId: "cus_vp_dg", stripeSubscriptionId: "sub_vp_dg",
    status: "active", priceId: "price_vp", currentPeriodEnd: null,
  });
  check((await resolveMemberTier(member.id)) === "founding", "fixture member starts founding");
  const entityRows = await db.execute(sql`SELECT id FROM entities WHERE status = 'active' LIMIT 7`);
  const entityIds = entityRows.rows.map((row) => String(row.id));
  check(entityIds.length === 7, "7 real entities available for the fixture");
  for (const entityId of entityIds) {
    await watchEntity(member.id, entityId);
  }
  check((await countWatchedEntities(member.id)) === 7, "founding member watches 7 (over free limit)");
  // Downgrade via the SAME path the webhook uses.
  const synced = await syncSubscriptionByStripeId({
    stripeSubscriptionId: "sub_vp_dg", status: "canceled", priceId: "price_vp", currentPeriodEnd: null,
  });
  check(synced, "webhook-path sync matches the subscription row");
  check((await resolveMemberTier(member.id)) === "free", "canceled → tier free");
  // The downgrade doctrine: rows KEPT (read-only over the limit), adding refused.
  check((await countWatchedEntities(member.id)) === 7, "all 7 watches SURVIVE the downgrade");
  check(!canAddWatch("free", await countWatchedEntities(member.id)), "adding an 8th is refused");
  await unwatchEntity(member.id, entityIds[0]!);
  check((await countWatchedEntities(member.id)) === 6, "unwatch still works after downgrade");

  console.log("\n— webhook signature verification (stripe SDK, self-signed fixtures) —");
  const secret = "whsec_verify_payments_fixture";
  const stripe = new Stripe("sk_test_verify_payments_unused");
  const eventPayload = JSON.stringify({
    id: "evt_vp_1",
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_vp_dg",
        object: "subscription",
        customer: "cus_vp_dg",
        status: "active",
        items: { data: [{ price: { id: "price_vp" }, current_period_end: 1_790_000_000 }] },
      },
    },
  });
  const now = Math.floor(Date.now() / 1000);
  const goodHeader = signStripePayload(eventPayload, secret, now);
  let verified: Stripe.Event | null = null;
  try {
    verified = await stripe.webhooks.constructEventAsync(eventPayload, goodHeader, secret);
  } catch {
    verified = null;
  }
  check(verified !== null && verified.type === "customer.subscription.updated", "valid signature verifies");
  let rejected = false;
  try {
    await stripe.webhooks.constructEventAsync(eventPayload, goodHeader, "whsec_wrong_secret");
  } catch {
    rejected = true;
  }
  check(rejected, "wrong secret → rejected");
  rejected = false;
  try {
    await stripe.webhooks.constructEventAsync(
      eventPayload.replace("active", "trialing"),
      goodHeader,
      secret,
    );
  } catch {
    rejected = true;
  }
  check(rejected, "tampered payload → rejected");
  const staleHeader = signStripePayload(eventPayload, secret, now - 3600);
  rejected = false;
  try {
    await stripe.webhooks.constructEventAsync(eventPayload, staleHeader, secret);
  } catch {
    rejected = true;
  }
  check(rejected, "stale timestamp (1h) → rejected (replay protection)");

  console.log("\n— status-sync fixtures (pure mapper + DB round-trip) —");
  const parsed = JSON.parse(eventPayload) as { type: string; data: { object: Record<string, unknown> } };
  const sync = subscriptionSyncFromEvent(parsed);
  check(sync !== null && sync.status === "active" && sync.priceId === "price_vp", "updated event maps status+price");
  check(sync !== null && sync.currentPeriodEnd === 1_790_000_000, "period end read from subscription items");
  const deleted = subscriptionSyncFromEvent({
    type: "customer.subscription.deleted",
    data: { object: { id: "sub_vp_dg", customer: "cus_vp_dg", status: "active", items: { data: [] } } },
  });
  check(deleted !== null && deleted.status === "canceled", "deleted event forces status=canceled");
  check(subscriptionSyncFromEvent({ type: "invoice.paid", data: { object: {} } }) === null, "unrelated events map to null");
  // Round-trip: re-activate through the mapper output, then read the tier.
  await syncSubscriptionByStripeId({
    stripeSubscriptionId: sync!.stripeSubscriptionId,
    status: sync!.status,
    priceId: sync!.priceId,
    currentPeriodEnd: new Date(sync!.currentPeriodEnd! * 1000),
  });
  check((await resolveMemberTier(member.id)) === "founding", "synced re-activation restores founding");
  const stored = await getSubscription(member.id);
  check(
    stored?.currentPeriodEnd?.getTime() === 1_790_000_000 * 1000,
    "current_period_end persisted from the event",
  );

  console.log("\n— export rate-limit math —");
  check((await countExportsToday(member.id)) === 0, "no exports logged yet");
  for (let i = 0; i < EXPORTS_PER_DAY; i++) {
    await logExport(member.id, "entities", { i });
  }
  const used = await countExportsToday(member.id);
  check(used === EXPORTS_PER_DAY, `log counts today's exports (${used})`);
  check(used >= EXPORTS_PER_DAY, "11th export would be refused (gate math)");

  console.log("\n— brief guards (digit/name/citation, deterministic) —");
  const inputs: ComposeInputs = {
    factTitles: ["Bankruptcy assets auction announced · 2026-04-22"],
    excerpts: ["Assets of Eko Morava valued at 4.500.000 dinars go to auction on 22.04.2026."],
    sourceNames: ["ALSU"],
    entityNames: ["Eko Morava"],
  };
  const goodBrief = {
    summary:
      "Eko Morava is in bankruptcy proceedings. The record shows an asset auction announced for 22.04.2026. Assets are valued at 4.500.000 dinars according to the register.",
    key_facts: ["Auction of assets valued at 4.500.000 dinars set for 22.04.2026 [ALSU]"],
    relationships: [],
    watch_points: ["Auction date 22.04.2026 from the announced sale"],
  };
  check(guardBrief(goodBrief, inputs).ok, "sourced, cited draft passes");
  check(
    !guardBrief({ ...goodBrief, key_facts: ["Assets valued at 7.000.000 dinars [ALSU]"] }, inputs).ok,
    "invented number → dropped",
  );
  check(
    !guardBrief(
      { ...goodBrief, summary: goodBrief.summary.replace("Eko Morava is", "Alpha Recovery Partners bought Eko Morava, which is") },
      inputs,
    ).ok,
    "invented entity name → dropped",
  );
  check(
    !guardBrief({ ...goodBrief, key_facts: ["Auction set for 22.04.2026"] }, inputs).ok,
    "key fact without [source] → dropped",
  );
  check(
    !guardBrief({ ...goodBrief, key_facts: ["Auction set for 22.04.2026 [Bloomberg]"] }, inputs).ok,
    "key fact citing unknown source → dropped",
  );
  check(
    guardBrief({ ...goodBrief, key_facts: [`Auction set for 22.04.2026 [${INTERNAL_SOURCE_NAME}]`] }, inputs).ok,
    "internal-record citation accepted",
  );
  check(
    !guardBrief({ ...goodBrief, summary: "Eko Morava is bankrupt." }, inputs).ok,
    "1-sentence summary → dropped (3–5 required)",
  );
  const abbrevSummary =
    "Eko Morava d.o.o. is in bankruptcy proceedings. The record shows an asset auction announced for 22.04.2026. Assets are valued at 4.500.000 dinars according to the register.";
  check(
    guardBrief({ ...goodBrief, summary: abbrevSummary }, { ...inputs, entityNames: ["Eko Morava d.o.o."] }).ok,
    "legal-form dots (d.o.o.) do not break sentence counting",
  );
  check(
    !guardBrief({ ...goodBrief, key_facts: Array.from({ length: 7 }, (_, i) => `Fact ${i} [ALSU]`) }, inputs).ok,
    "7 key facts → dropped (max 6)",
  );

  console.log("\n— brief cache: data-version fingerprint + staleness —");
  const fixtureA = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('organization', 'Verify Payments Fixture A', ${SLUG + "a"}, 'provisional')
    RETURNING id
  `);
  const fixtureB = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('organization', 'Verify Payments Fixture B', ${SLUG + "b"}, 'provisional')
    RETURNING id
  `);
  const idA = String(fixtureA.rows[0]!.id);
  const idB = String(fixtureB.rows[0]!.id);
  const versionBefore = await computeBriefDataVersion(idA);
  const versionB0 = await computeBriefDataVersion(idB);
  const content: BriefContent = {
    summary: "s", key_facts: ["k [ALSU]"], relationships: [], watch_points: [], source_names: ["ALSU"],
  };
  await upsertBrief({
    entityId: idA, content, dataVersion: versionBefore, model: "fixture",
    generatedByMemberId: member.id, inputTokens: 1, outputTokens: 1, costUsd: 0.001,
  });
  const cached = await getBrief(idA);
  check(cached !== null && cached.dataVersion === versionBefore, "cached brief carries its fingerprint (fresh)");
  // The record moves (approved edge appears) → fingerprint moves → stale.
  await db.execute(sql`
    INSERT INTO edges (edge_type, source_entity_id, target_entity_id, status)
    VALUES ('advised_on', ${idA}::uuid, ${idB}::uuid, 'approved')
  `);
  const versionAfter = await computeBriefDataVersion(idA);
  check(versionAfter !== versionBefore, "approved edge changes the fingerprint");
  check((await getBrief(idA))!.dataVersion !== versionAfter, "cached brief now reads STALE → regenerate");
  check(
    (await computeBriefDataVersion(idB)) !== versionB0,
    "edge fingerprint moves on the TARGET side too",
  );

  console.log("\n— brief caps + cost guard math —");
  check((await countBriefGenerationsThisMonth(member.id)) === 0, "no generations logged yet");
  for (let i = 0; i < 3; i++) {
    await logBriefGeneration({
      memberId: member.id, entityId: idA, costUsd: 0.05,
      inputTokens: 100, outputTokens: 50, outcome: i === 2 ? "dropped_guard" : "stored",
    });
  }
  const monthCount = await countBriefGenerationsThisMonth(member.id);
  check(monthCount === 3, `stored AND dropped generations count against the member cap (${monthCount})`);
  check(monthCount < BRIEF_MEMBER_MONTHLY_CAP, "fixture is under the 20/month cap");
  const costToday = await briefCostTodayUsd();
  check(costToday >= 0.15, `global daily cost sums all members (${costToday.toFixed(2)})`);
  check(BRIEF_GLOBAL_DAILY_BUDGET_USD === 2.0, "daily budget constant is $2");
  check((await countAlertEnabledViews(member.id)) === 0, "alert-enabled view count reads clean");

  await cleanup();
  if (failures > 0) {
    console.error(`\nverify-payments: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-payments: PASS — the paid line is honest");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

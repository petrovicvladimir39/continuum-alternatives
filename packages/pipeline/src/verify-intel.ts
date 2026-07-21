import "./env";
import {
  COMPS_MIN_DEALS,
  compsRenderable,
  mulberry32,
  parseAsk,
  parseAsOf,
  runNplSimulation,
  triangularSample,
  validateNplParams,
  type NplSimParams,
} from "@continuum/shared";
import {
  approveScoutSubmission,
  compsByClass,
  createScoutSubmission,
  db,
  getCachedDocChat,
  getCachedGrounding,
  getPublicProfile,
  normalizeQuestion,
  sql,
  storeDocChat,
  storeGrounding,
  tryConsumeDailyUsage,
  upsertMemberProfile,
  watchEntity,
  watchdogWeekItems,
} from "@continuum/db";
import { guardFilingAnswer, NO_ANSWER_FALLBACK } from "./filing-guards";
import { sanitizeGroundedFilters, shouldInvokeGrounder } from "./ask-ground";
import { composeWatchdogBrief, currentWeekStart } from "./watchdog-compose";

/**
 * Verify: Phase 34 — time travel (bitemporal reconstruction + ALSU split),
 * NPL simulator vs hand-computed fixtures, comps gate, filing-chat guard +
 * cache + caps, ask-grounding rules + rendering identity, watchdog + scout.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

const FIX = "user_verify_intel_";
const SLUG = "verify-intel-fx";

async function cleanup(): Promise<void> {
  const members = await db.execute(
    sql`SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`,
  );
  for (const row of members.rows) {
    const id = String(row.id);
    await db.execute(sql`DELETE FROM member_daily_usage WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM watchdog_briefs WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_watchlist WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM doc_chats WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM scout_submissions WHERE member_id = ${id}`);
  }
  await db.execute(sql`
    DELETE FROM timeline_facts WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM edges WHERE source_entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
      OR target_entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`DELETE FROM documents WHERE title = 'verify-intel doc' OR url LIKE 'https://verify-intel%'`);
  await db.execute(sql`DELETE FROM ask_groundings WHERE question_normalized LIKE 'verify intel%'`);
  await db.execute(sql`DELETE FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`);
  await db.execute(sql`
    DELETE FROM organizations WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`DELETE FROM entities WHERE slug LIKE ${SLUG + "%"}`);
}

async function main(): Promise<void> {
  await cleanup();
  const TODAY = new Date().toISOString().slice(0, 10);

  console.log("— 34A: parseAsOf (pure) —");
  check(parseAsOf("2024-06-30", TODAY) === "2024-06-30", "valid past date accepted");
  check(parseAsOf("2024-02-31", TODAY) === null, "non-date rejected");
  check(parseAsOf("2999-01-01", TODAY) === null, "future rejected");
  check(parseAsOf(TODAY, TODAY) === null, "today = live record, no as-of");
  check(parseAsOf("nonsense", TODAY) === null, "garbage rejected");

  console.log("\n— 34A: bitemporal reconstruction —");
  // Fixture: fact A occurred+recorded early; fact B occurred EARLY but
  // recorded LATE (a backfill). The 2024 view must exclude B.
  const entity = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('organization', 'Verify Intel Holding', ${SLUG}, 'active') RETURNING id
  `);
  const entityId = String(entity.rows[0]!.id);
  await db.execute(sql`INSERT INTO organizations (entity_id) VALUES (${entityId}::uuid)`);
  await db.execute(sql`
    INSERT INTO timeline_facts (entity_id, fact_type, occurred_on, title, status, confidence, recorded_at)
    VALUES
      (${entityId}::uuid, 'signal', '2024-01-10', 'Fact A — known early', 'approved', '0.9', '2024-01-12T00:00:00Z'),
      (${entityId}::uuid, 'signal', '2023-06-01', 'Fact B — backfilled late', 'approved', '0.9', '2025-03-01T00:00:00Z')
  `);
  const live = await getPublicProfile(SLUG, "organization");
  check(live !== null && live.factsCount === 2, "live view holds both facts");
  const asof2024 = await getPublicProfile(SLUG, "organization", { asof: "2024-06-30" });
  check(
    asof2024 !== null &&
      asof2024.factsCount === 1 &&
      asof2024.facts[0]!.title === "Fact A — known early",
    "2024 view excludes the 2025 backfill despite its 2023 occurred_on (recorded dimension)",
  );
  const asof2023 = await getPublicProfile(SLUG, "organization", { asof: "2023-12-31" });
  check(asof2023 !== null && asof2023.factsCount === 0, "2023 view is empty on both dimensions");
  const asofLater = await getPublicProfile(SLUG, "organization", { asof: "2025-03-02" });
  check(asofLater !== null && asofLater.factsCount === 2, "post-backfill view reconstructs both");

  console.log("\n— 34A: ALSU backfill split holds in production data —");
  const alsuSplit = await db.execute(sql`
    SELECT count(*)::int AS n FROM timeline_facts
    WHERE status = 'approved' AND recorded_at::date > occurred_on + 30
  `);
  check(
    Number(alsuSplit.rows[0]!.n) > 0,
    `real backfilled facts exist (${alsuSplit.rows[0]!.n} recorded 30d+ after occurrence) — the two dimensions are genuinely distinct`,
  );

  console.log("\n— 34B: NPL simulator vs hand-computed fixture —");
  // Zero-variance: haircut fixed 0.4, years fixed 2 → every run identical.
  // gross = 1,000,000 × 1.0 × 0.6 = 600,000; net = 540,000;
  // pv = 540,000 / 1.1² = 446,280.9917…; irr = (540,000/300,000)^(1/2) − 1.
  const fixed: NplSimParams = {
    nominal: 1_000_000, securedShare: 1, haircutMin: 0.4, haircutMax: 0.4,
    unsecuredRecoveryRate: 0, yearsMin: 2, yearsMode: 2, yearsMax: 2,
    servicingCostRate: 0.1, discountRate: 0.1, priceRate: 0.3,
  };
  const fixedRun = runNplSimulation(fixed, 500, 7);
  check(near(fixedRun.netRecovery.p50, 540_000), `net = 540,000 (${fixedRun.netRecovery.p50})`);
  check(near(fixedRun.netRecovery.p10, fixedRun.netRecovery.p90), "zero variance → flat distribution");
  check(near(fixedRun.presentValue.p50, 540_000 / 1.21, 0.01), `pv = 446,280.99 (${fixedRun.presentValue.p50.toFixed(2)})`);
  check(near(fixedRun.irr.p50, Math.sqrt(540_000 / 300_000) - 1), `irr = 34.164% (${(fixedRun.irr.p50 * 100).toFixed(3)}%)`);
  const spread: NplSimParams = { ...fixed, haircutMin: 0.2, haircutMax: 0.6, yearsMin: 1, yearsMode: 3, yearsMax: 7 };
  const runA = runNplSimulation(spread, 10_000, 42);
  const runB = runNplSimulation(spread, 10_000, 42);
  const runC = runNplSimulation(spread, 10_000, 43);
  check(runA.netRecovery.p50 === runB.netRecovery.p50 && runA.irr.p90 === runB.irr.p90, "same seed → identical output (reproducible)");
  check(runA.netRecovery.p50 !== runC.netRecovery.p50, "different seed → different draw");
  check(runA.histogram.reduce((sum, bin) => sum + bin.count, 0) === 10_000, "histogram accounts for every run");
  check(runA.netRecovery.p10 < runA.netRecovery.p50 && runA.netRecovery.p50 < runA.netRecovery.p90, "percentiles ordered");
  // Analytic mean haircut 0.4 → same expected net; MC mean within 1%.
  check(Math.abs(runA.netRecovery.mean - 540_000) / 540_000 < 0.01, `MC mean ≈ analytic (${runA.netRecovery.mean.toFixed(0)})`);
  check(validateNplParams({ ...fixed, haircutMin: 0.7, haircutMax: 0.2 }) !== null, "inverted haircut range rejected");
  check(validateNplParams({ ...fixed, priceRate: 0 }) !== null, "zero price rejected (IRR needs a price)");
  const rand = mulberry32(1);
  for (let i = 0; i < 200; i++) {
    const draw = triangularSample(rand(), 1, 3, 7);
    if (draw < 1 || draw > 7) {
      failures += 1;
      console.log("FAIL  triangular sample out of bounds");
      break;
    }
  }
  check(true, "triangular samples stay in [min, max] (200 draws)");

  console.log("\n— 34B: comps gate —");
  check(!compsRenderable(COMPS_MIN_DEALS - 1) && compsRenderable(COMPS_MIN_DEALS), "gate flips exactly at the minimum");
  const comps = await compsByClass();
  check(Array.isArray(comps), `comps engine runs (${comps.length} class(es) with amount-parsed deals)`);
  for (const row of comps) {
    if (compsRenderable(row.dealCount)) {
      check(row.minAmount <= row.medianAmount && row.medianAmount <= row.maxAmount, `${row.assetClass}: min ≤ median ≤ max`);
    }
  }

  console.log("\n— 34C: filing-chat guard + cache + caps —");
  const DOC_TEXT = "The property at Brzan was offered for 4.500.000 dinars. The deadline for bids is 22 April 2026. The administrator is listed in the filing.";
  const good = guardFilingAnswer(
    { answer: "The offered price is stated.", quotes: [{ verbatim: "offered for 4.500.000 dinars", note: "price" }] },
    DOC_TEXT,
  );
  check(good.quotes.length === 1 && good.answer === "The offered price is stated.", "verbatim substring survives");
  const fabricated = guardFilingAnswer(
    { answer: "It sold for 9 million.", quotes: [{ verbatim: "sold for 9.000.000 dinars", note: "" }] },
    DOC_TEXT,
  );
  check(fabricated.answer === NO_ANSWER_FALLBACK && fabricated.quotes.length === 0, "fabricated quote → honest fallback, no prose survives");
  const mixed = guardFilingAnswer(
    { answer: "Price and deadline are stated.", quotes: [
      { verbatim: "offered for 4.500.000 dinars", note: "price" },
      { verbatim: "this text is invented", note: "x" },
    ] },
    DOC_TEXT,
  );
  check(mixed.quotes.length === 1, "violators dropped, survivors kept");
  const longAnswer = guardFilingAnswer(
    { answer: Array(200).fill("word").join(" "), quotes: [{ verbatim: "deadline for bids is 22 April 2026", note: "" }] },
    DOC_TEXT,
  );
  check(longAnswer.answer.split(/\s+/).length <= 121, "answers truncate at 120 words");
  check(normalizeQuestion("  What   is the PRICE? ") === normalizeQuestion("what is the price?"), "question normalization collapses variants");

  const docRow = await db.execute(sql`
    INSERT INTO documents (title, url, content_text, fetched_at)
    VALUES ('verify-intel doc', 'https://verify-intel.test/doc', ${DOC_TEXT}, now()) RETURNING id
  `);
  const docId = String(docRow.rows[0]!.id);
  const chatMember = await upsertMemberProfile({ clerkUserId: `${FIX}chat`, email: "intel-chat@test.test" });
  await storeDocChat({ documentId: docId, memberId: chatMember.id, questionNormalized: "what is the price?", answer: good, costUsd: 0.001 });
  const cachedHit = await getCachedDocChat(docId, normalizeQuestion("What   is the price?"));
  check(cachedHit !== null && cachedHit.quotes.length === 1, "cache hit on normalized question");
  for (let i = 0; i < 3; i++) {
    check(await tryConsumeDailyUsage(chatMember.id, "doc_chat", 3), `free question ${i + 1}/3 allowed`);
  }
  check(!(await tryConsumeDailyUsage(chatMember.id, "doc_chat", 3)), "4th free question refused (3/day)");

  console.log("\n— 34D: grounding rules + rendering identity —");
  const strongParse = parseAsk("distressed serbia");
  check(strongParse !== null && strongParse.matches.length > 0, "deterministic parse is strong for known tokens");
  check(!shouldInvokeGrounder(strongParse, "distressed serbia"), "strong parse → grounder NOT invoked");
  const weakParse = parseAsk("interesting situations near ports");
  check(
    weakParse !== null && weakParse.matches.length === 0,
    "fixture query genuinely defeats the deterministic parser",
  );
  check(shouldInvokeGrounder(weakParse, "interesting situations near ports"), "weak parse (free text only) → grounder eligible");
  check(!shouldInvokeGrounder(null, "ab"), "tiny queries never ground");
  const grounded = sanitizeGroundedFilters(
    { channels: ["distressed", "nonsense_channel"], countries: ["rs", "XX"], fact_types: ["asset_sale_announced", "DROP TABLE"], strategies: [], asset_classes: [], entity_term: "Uljanik" },
    "interesting situations near ports",
  );
  check(grounded.channels.length === 1 && grounded.channels[0] === "distressed", "unknown channel dropped (closed vocabulary)");
  check(grounded.countries.length === 1 && grounded.countries[0] === "RS", "countries validated + uppercased");
  check(grounded.factTypes.length === 1, "malformed fact type dropped");
  check(grounded.freeText === "Uljanik", "entity term flows to the same freeText leg");
  const detParse = parseAsk("npl serbia")!;
  check(
    detParse.channels[0] === grounded.channels[0] && detParse.countries[0] === grounded.countries[0],
    "grounded filters are structurally identical to a deterministic parse (same rendering path)",
  );
  check(
    grounded.matches.every((match) => ["channel", "country", "factType", "strategy"].includes(match.kind) && match.tokens.length > 0),
    "grounded chips carry the AskMatch shape (kind/value/label/tokens)",
  );
  await storeGrounding("verify intel shipyards", { channels: ["distressed"] }, 0.002);
  const cachedGrounding = await getCachedGrounding("verify intel shipyards");
  check(cachedGrounding !== null, "grounding cache round-trips");
  const hitCount = await db.execute(sql`SELECT hit_count FROM ask_groundings WHERE question_normalized = 'verify intel shipyards'`);
  check(Number(hitCount.rows[0]!.hit_count) === 1, "cache hits are counted");

  console.log("\n— 34E: watchdog week + empty honesty —");
  check(/^\d{4}-\d{2}-\d{2}$/.test(currentWeekStart()), "week start is a date");
  check(currentWeekStart(new Date("2026-07-20T12:00:00Z")) === "2026-07-20", "Monday maps to itself");
  check(currentWeekStart(new Date("2026-07-26T12:00:00Z")) === "2026-07-20", "Sunday maps back to Monday");
  const watchMember = await upsertMemberProfile({ clerkUserId: `${FIX}watch`, email: "intel-watch@test.test" });
  const emptyResult = await composeWatchdogBrief(watchMember.id, currentWeekStart());
  check(emptyResult.status === "empty", "empty week → skipped honestly, NO model call");
  await watchEntity(watchMember.id, entityId);
  await db.execute(sql`
    INSERT INTO timeline_facts (entity_id, fact_type, occurred_on, title, status, confidence, recorded_at)
    VALUES (${entityId}::uuid, 'signal', current_date, 'Verify Intel Holding files quarterly report', 'approved', '0.9', now())
  `);
  const weekItems = await watchdogWeekItems(watchMember.id);
  check(weekItems.length >= 1 && weekItems.some((item) => item.title.includes("quarterly report")), "week items surface watched-entity facts");

  console.log("\n— 34E: scout → approved fact with citation + credit —");
  const scoutMember = await upsertMemberProfile({ clerkUserId: `${FIX}scout`, email: "intel-scout@test.test", displayName: "Vera Scout" });
  const submission = await createScoutSubmission({
    memberId: scoutMember.id, factType: "signal", entityIds: [entityId], entitiesFree: null,
    occurredOn: "2026-07-01", sourceUrl: "https://verify-intel.test/source", note: "Spotted in the gazette.", anonymous: false,
  });
  const published = await approveScoutSubmission(submission.id, "Gazette notes Verify Intel Holding restructuring");
  check(published !== null && published.factIds.length === 1, "approval publishes exactly one fact");
  const profileAfter = await getPublicProfile(SLUG, "organization");
  const scoutFact = profileAfter?.facts.find((fact) => fact.title.startsWith("Gazette notes"));
  check(scoutFact !== undefined, "scout fact renders on the timeline");
  check(scoutFact?.contributedBy === "Vera Scout", "credit line carries the member's display name");
  check(scoutFact?.citation !== null && scoutFact?.citation?.url === "https://verify-intel.test/source", "the source URL became a real citation");
  const anonSubmission = await createScoutSubmission({
    memberId: scoutMember.id, factType: "signal", entityIds: [entityId], entitiesFree: null,
    occurredOn: "2026-07-02", sourceUrl: "https://verify-intel.test/source2", note: null, anonymous: true,
  });
  await approveScoutSubmission(anonSubmission.id, "Second gazette note on Verify Intel Holding");
  const profileAnon = await getPublicProfile(SLUG, "organization");
  const anonFact = profileAnon?.facts.find((fact) => fact.title.startsWith("Second gazette"));
  check(anonFact !== undefined && anonFact.contributedBy === null, "anonymous contribution → no public credit line");

  await cleanup();
  if (failures > 0) {
    console.error(`\nverify-intel: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-intel: PASS — the intelligence toolkit is grounded, gated, and honest");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

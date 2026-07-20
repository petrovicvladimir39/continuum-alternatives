import "./env";
import {
  isPostingBanned,
  POST_MAX_CHARS,
  POST_MAX_LINKS,
  POST_MIN_CHARS,
  POSTS_PER_MEMBER_PER_DAY,
  validatePostBody,
} from "@continuum/shared";
import {
  countPostsToday,
  createThreadPost,
  db,
  discussedEntities,
  enqueuePostAlerts,
  listModerationPosts,
  listOutbox,
  listThreadPosts,
  memberHasPosted,
  memberReactionsFor,
  reactionCountsFor,
  REACTION_PUBLIC_THRESHOLD,
  reportPost,
  setMemberBan,
  setPostStatus,
  sql,
  toggleReaction,
  upsertMemberProfile,
  watchEntity,
} from "@continuum/db";

/**
 * Verify: Phase 30 — reactions + threads. Reaction switch/uniqueness,
 * aggregate thresholds, post rate limits, sanitizer injection fixtures,
 * report→remove→stub flow, ban enforcement, watch-post alert routing,
 * Discussed-module minimums.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const FIX = "user_verify_engage_";
const SLUG = "verify-engage-fixture-";

async function cleanup(): Promise<void> {
  await db.execute(sql`
    DELETE FROM post_reports WHERE post_id IN
      (SELECT id FROM thread_posts WHERE member_id IN
        (SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}))
  `);
  await db.execute(sql`
    DELETE FROM alert_outbox WHERE kind = 'post' AND ref_id IN
      (SELECT id FROM thread_posts WHERE member_id IN
        (SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}))
  `);
  const members = await db.execute(
    sql`SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`,
  );
  for (const row of members.rows) {
    const id = String(row.id);
    await db.execute(sql`DELETE FROM alert_outbox WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM thread_posts WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM item_reactions WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_watchlist WHERE member_id = ${id}`);
  }
  await db.execute(sql`DELETE FROM entities WHERE slug LIKE ${SLUG + "%"}`);
  await db.execute(sql`DELETE FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`);
}

async function main(): Promise<void> {
  await cleanup();

  const alice = await upsertMemberProfile({
    clerkUserId: `${FIX}alice`,
    email: "engage-a@test.test",
    displayName: "Alice Fixture",
  });
  const bob = await upsertMemberProfile({
    clerkUserId: `${FIX}bob`,
    email: "engage-b@test.test",
    displayName: "Bob Fixture",
  });
  const factRow = await db.execute(
    sql`SELECT id FROM timeline_facts WHERE status = 'approved' LIMIT 1`,
  );
  const factId = String(factRow.rows[0]!.id);

  console.log("— reaction switch + uniqueness —");
  check((await toggleReaction(alice.id, "fact", factId, "credible")) === "set", "first reaction sets");
  let counts = (await reactionCountsFor("fact", [factId])).get(factId)!;
  check(counts.credible >= 1, "count reflects the reaction");
  const before = counts.credible;
  check((await toggleReaction(alice.id, "fact", factId, "doubtful")) === "set", "different reaction switches");
  counts = (await reactionCountsFor("fact", [factId])).get(factId)!;
  check(counts.credible === before - 1 && counts.doubtful >= 1, "switch moves the count, never duplicates");
  const own = await memberReactionsFor(alice.id, "fact", [factId]);
  check(own.get(factId) === "doubtful", "member's own state reads back");
  check((await toggleReaction(alice.id, "fact", factId, "doubtful")) === "cleared", "same reaction again clears");
  check(
    (await memberReactionsFor(alice.id, "fact", [factId])).get(factId) === undefined,
    "cleared reaction leaves no state",
  );

  console.log("\n— aggregate threshold —");
  check(REACTION_PUBLIC_THRESHOLD === 3, "public counts appear at ≥3 only");
  check(
    ((await reactionCountsFor("fact", [])).size as number) === 0,
    "empty target list short-circuits",
  );

  console.log("\n— sanitizer on post bodies (injection fixtures) —");
  const script = validatePostBody(
    `Before <script>document.location='https://evil.example'</script> after — a perfectly reasonable observation.`,
  );
  check(script.ok && !script.body.includes("script") && !script.body.includes("evil"), "script blocks vanish with contents");
  const html = validatePostBody(`<img src=x onerror=alert(1)> The auction terms look aggressive for this collateral.`);
  check(html.ok && !html.body.includes("<") && html.body.includes("auction terms"), "raw HTML neutralized, text kept");
  const shortPost = validatePostBody("Too short.");
  check(!shortPost.ok && shortPost.reason === "too_short", `under ${POST_MIN_CHARS} chars refused`);
  const longPost = validatePostBody("x".repeat(POST_MAX_CHARS + 1));
  check(!longPost.ok && longPost.reason === "too_long", `over ${POST_MAX_CHARS} chars refused`);
  const links = validatePostBody(
    "See [a](https://x.test/1) and [b](https://x.test/2) and also https://x.test/3 — one too many links here.",
  );
  check(!links.ok && links.reason === "too_many_links", `more than ${POST_MAX_LINKS} links refused (bare URLs count)`);
  const jsLink = validatePostBody("Try [this](javascript:alert(1)) — the link should collapse to plain text safely.");
  check(jsLink.ok && !jsLink.body.includes("javascript:"), "javascript: links collapse to text");

  console.log("\n— posting + rate limit —");
  const entityFixture = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('organization', 'Verify Engage Fixture Co', ${SLUG + "a"}, 'active')
    RETURNING id
  `);
  const entityId = String(entityFixture.rows[0]!.id);
  check(!(await memberHasPosted(alice.id)), "first-post notice gate reads clean before posting");
  const post1 = await createThreadPost({
    memberId: alice.id,
    anchorKind: "entity",
    anchorId: entityId,
    body: "Opening observation on this fixture entity — the record looks thin but consistent.",
  });
  check(await memberHasPosted(alice.id), "first post flips the notice gate");
  for (let i = 0; i < POSTS_PER_MEMBER_PER_DAY - 1; i++) {
    await createThreadPost({
      memberId: alice.id,
      anchorKind: "entity",
      anchorId: entityId,
      body: `Follow-up number ${i + 2} with enough substance to clear the minimum length.`,
    });
  }
  const today = await countPostsToday(alice.id);
  check(today === POSTS_PER_MEMBER_PER_DAY, `rate-limit counter reads ${POSTS_PER_MEMBER_PER_DAY} (got ${today})`);
  check(today >= POSTS_PER_MEMBER_PER_DAY, "6th post today would be refused (gate math)");
  const thread = await listThreadPosts("entity", entityId);
  check(thread.length === POSTS_PER_MEMBER_PER_DAY, "flat thread lists every published post");
  check(thread[0]!.authorName === "Alice Fixture", "real-name policy: display name on the post");

  console.log("\n— watch-post alert routing —");
  await watchEntity(bob.id, entityId);
  await watchEntity(alice.id, entityId); // poster watches their own entity too
  const delivered = await enqueuePostAlerts(post1.id, entityId, alice.id);
  check(delivered === 1, `watcher gets one outbox row, poster excluded (${delivered})`);
  const bobOutbox = await listOutbox(bob.id, { unsentOnly: true });
  const postItem = bobOutbox.find((item) => item.kind === "post" && item.refId === post1.id);
  check(postItem !== undefined, "outbox resolves the post row");
  check(postItem !== undefined && (postItem.title ?? "").startsWith("Discussion:"), "post renders as a Discussion item");
  check(postItem !== undefined && postItem.href !== null, "post alert links to the entity page");
  const again = await enqueuePostAlerts(post1.id, entityId, alice.id);
  check(again === 0, "re-enqueue is idempotent");
  const aliceOutbox = await listOutbox(alice.id, { unsentOnly: true });
  check(
    aliceOutbox.every((item) => !(item.kind === "post" && item.refId === post1.id)),
    "poster holds no alert about their own post",
  );

  console.log("\n— report → remove → stub → restore —");
  await reportPost(post1.id, bob.id, "confidential info");
  await reportPost(post1.id, bob.id, "duplicate report");
  const moderation = await listModerationPosts();
  const reported = moderation.find((post) => post.id === post1.id);
  check(reported !== undefined && reported.reportCount === 1, "duplicate reports from one member collapse");
  check(reported !== undefined && reported.reportReasons.includes("confidential info"), "first reason kept");
  check(reported !== undefined && reported.authorEmail === "engage-a@test.test", "admin sees poster identity");
  check(moderation[0]!.reportCount >= (moderation[1]?.reportCount ?? 0), "reported posts sort first");
  await setPostStatus(post1.id, "removed");
  const withStub = await listThreadPosts("entity", entityId);
  const stub = withStub.find((post) => post.id === post1.id);
  check(stub !== undefined && stub.status === "removed" && stub.body === "", "removed post becomes a bodyless stub");
  check(withStub.length === POSTS_PER_MEMBER_PER_DAY, "thread continuity: the stub keeps its place");
  await setPostStatus(post1.id, "published");
  const restored = await listThreadPosts("entity", entityId);
  check(restored.find((post) => post.id === post1.id)!.body !== "", "restore brings the body back");

  console.log("\n— ban enforcement (pure + roundtrip) —");
  check(!isPostingBanned(null), "null = not banned");
  check(!isPostingBanned(new Date(Date.now() - 1000)), "past ban expired");
  check(isPostingBanned(new Date(Date.now() + 1000)), "future ban blocks");
  await setMemberBan(alice.id, new Date(Date.now() + 86_400_000));
  const bannedRow = await db.execute(
    sql`SELECT banned_until FROM member_profiles WHERE id = ${alice.id}`,
  );
  check(
    isPostingBanned(new Date(String(bannedRow.rows[0]!.banned_until))),
    "ban persists and enforces",
  );
  await setMemberBan(alice.id, null);
  const cleared = await db.execute(
    sql`SELECT banned_until FROM member_profiles WHERE id = ${alice.id}`,
  );
  check(cleared.rows[0]!.banned_until === null, "toggle clears the ban");

  console.log("\n— Discussed-module minimums —");
  const entityB = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('organization', 'Verify Engage Fixture Two', ${SLUG + "b"}, 'active')
    RETURNING id
  `);
  const entityBId = String(entityB.rows[0]!.id);
  await createThreadPost({
    memberId: bob.id,
    anchorKind: "entity",
    anchorId: entityBId,
    body: "A single post — below the Discussed minimum, so it must not surface.",
  });
  const discussed = await discussedEntities();
  check(
    !discussed.some((row) => row.entityId === entityBId),
    "1 post < minimum → hidden (honest, no filler)",
  );
  check(
    discussed.some((row) => row.entityId === entityId),
    `${POSTS_PER_MEMBER_PER_DAY} posts ≥ minimum → surfaces with count`,
  );
  const surfaced = discussed.find((row) => row.entityId === entityId);
  check(surfaced !== undefined && surfaced.postCount === POSTS_PER_MEMBER_PER_DAY, "count is the real published count");
  await setPostStatus(post1.id, "removed");
  const afterRemoval = await discussedEntities();
  const surfacedAfter = afterRemoval.find((row) => row.entityId === entityId);
  check(
    surfacedAfter === undefined || surfacedAfter.postCount === POSTS_PER_MEMBER_PER_DAY - 1,
    "removed posts do not count toward Discussed",
  );
  check(discussed.length <= 3, "module caps at 3 entities");

  await cleanup();
  if (failures > 0) {
    console.error(`\nverify-engagement: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-engagement: PASS — reactions + threads green");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

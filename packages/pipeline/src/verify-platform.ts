import "./env";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { emailMatchesWebsite, normalizeAlias } from "@continuum/shared";
import {
  apiUsageSummary,
  authenticateApiKey,
  checkRateLimit,
  claimStateFor,
  createClaim,
  createVendorStory,
  createWebhook,
  db,
  decideClaim,
  decideStory,
  decideStoryConsent,
  enqueueAlertsForEntities,
  issueApiKey,
  listOutbox,
  listPendingClaims,
  listProposedStories,
  publishedStories,
  recordApiUsage,
  revokeApiKey,
  setStewardStatement,
  sql,
  stewardOf,
  suggestFieldEdit,
  upsertMemberProfile,
  watchEntity,
} from "@continuum/db";
import { createContinuumMcpServer } from "./mcp-server";
import { deliverMemberWebhooks, signWebhookPayload, verifyWebhookSignature } from "./webhooks";

/**
 * Verify: Phase 33 — claiming, vendor stories (consent law), API keys +
 * rate limit + usage, endpoint inventory (no undocumented endpoints), MCP
 * in-process round-trip, webhook signature + auto-deactivate.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const FIX = "user_verify_platform_";
const SLUG = "verify-platform-fx-";

async function cleanup(): Promise<void> {
  const members = await db.execute(
    sql`SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`,
  );
  for (const row of members.rows) {
    const id = String(row.id);
    await db.execute(sql`DELETE FROM alert_outbox WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM api_usage WHERE key_id IN (SELECT id FROM api_keys WHERE member_id = ${id})`);
    await db.execute(sql`DELETE FROM api_rate_windows WHERE key_id IN (SELECT id FROM api_keys WHERE member_id = ${id})`);
    await db.execute(sql`DELETE FROM api_keys WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_webhooks WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_subscriptions WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_watchlist WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM vendor_stories WHERE created_by_member_id = ${id}`);
    await db.execute(sql`DELETE FROM org_claims WHERE member_id = ${id}`);
  }
  await db.execute(sql`
    DELETE FROM vendor_subscriptions WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM entity_tags WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM organizations WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM aliases WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`DELETE FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`);
  await db.execute(sql`DELETE FROM entities WHERE slug LIKE ${SLUG + "%"}`);
}

async function fixtureOrg(suffix: string, name: string, opts: { website?: string; tag?: string } = {}): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES ('organization', ${name}, ${SLUG + suffix}, 'active') RETURNING id
  `);
  const id = String(result.rows[0]!.id);
  await db.execute(sql`
    INSERT INTO aliases (entity_id, alias, alias_normalized)
    VALUES (${id}::uuid, ${name}, ${normalizeAlias(name)})
  `);
  await db.execute(sql`
    INSERT INTO organizations (entity_id, website) VALUES (${id}::uuid, ${opts.website ?? null})
  `);
  if (opts.tag !== undefined) {
    await db.execute(sql`INSERT INTO entity_tags (entity_id, tag) VALUES (${id}::uuid, ${opts.tag})`);
  }
  return id;
}

async function main(): Promise<void> {
  await cleanup();

  console.log("— email-domain matching (pure) —");
  check(emailMatchesWebsite("ana@acme.com", "https://www.acme.com/about"), "exact domain matches");
  check(emailMatchesWebsite("ana@mail.acme.com", "https://acme.com"), "subdomain matches");
  check(!emailMatchesWebsite("ana@gmail.com", "https://gmail.com"), "webmail NEVER matches");
  check(!emailMatchesWebsite("ana@other.com", "https://acme.com"), "unrelated domain refused");
  check(!emailMatchesWebsite("ana@acme.com", null), "no website → no match");

  console.log("\n— claim uniqueness + steward boundaries —");
  const ana = await upsertMemberProfile({ clerkUserId: `${FIX}ana`, email: "ana@vendorfx.test", displayName: "Ana Platform" });
  const ben = await upsertMemberProfile({ clerkUserId: `${FIX}ben`, email: "ben@clientfx.test", displayName: "Ben Platform" });
  const vendorOrg = await fixtureOrg("vendor", "Verify Platform Advisors", { website: "https://vendorfx.test", tag: "advisor_ma" });
  const clientOrg = await fixtureOrg("client", "Verify Platform Bank", { website: "https://clientfx.test", tag: "bank" });

  check((await createClaim({ entityId: vendorOrg, memberId: ana.id, method: "email_domain", evidence: "match" })) === "created", "claim files pending");
  check((await createClaim({ entityId: vendorOrg, memberId: ana.id, method: "manual", evidence: "again" })) === "already_pending", "duplicate pending refused");
  const pending = await listPendingClaims();
  check(pending.some((claim) => claim.entityId === vendorOrg && claim.memberEmail === "ana@vendorfx.test"), "admin sees claimant identity");
  const anaClaim = pending.find((claim) => claim.entityId === vendorOrg)!;
  check(await decideClaim(anaClaim.id, true), "approve grants stewardship");
  check((await stewardOf(vendorOrg)) === ana.id, "steward resolves");
  check((await createClaim({ entityId: vendorOrg, memberId: ben.id, method: "manual", evidence: "me too, I insist" })) === "already_claimed", "second claim on a claimed org refused");
  check((await claimStateFor(vendorOrg, ben.id)) === "claimed_other", "other members see claimed_other");

  check(!(await setStewardStatement(vendorOrg, ben.id, "not my org")), "non-steward cannot write the statement");
  check(await setStewardStatement(vendorOrg, ana.id, "We advise on <script>alert(1)</script> European NPL transactions."), "steward statement writes");
  const statement = await db.execute(sql`SELECT steward_statement FROM organizations WHERE entity_id = ${vendorOrg}`);
  check(!String(statement.rows[0]!.steward_statement).includes("<script>"), "statement sanitized");
  check(!(await suggestFieldEdit(vendorOrg, ana.id, "name", "New Name")), "non-whitelisted field refused (no direct record writes)");
  check(await suggestFieldEdit(vendorOrg, ana.id, "founded_year", "1998"), "whitelisted suggestion lands");
  const enrichment = await db.execute(sql`SELECT enrichment->'proposed' AS proposed FROM organizations WHERE entity_id = ${vendorOrg}`);
  check(JSON.stringify(enrichment.rows[0]!.proposed).includes("1998"), "suggestion sits in enrichment.proposed (review-queue lane)");

  console.log("\n— vendor stories: the client-consent law —");
  // Vendor must be ACTIVE to create stories via the action layer; the repo
  // is exercised directly here (subscription honesty tested in Phase 29).
  const anon = await createVendorStory({
    entityId: vendorOrg, memberId: ana.id, title: "NPL portfolio advisory",
    bodyMd: "Advised on the disposal of a non-performing loan portfolio across two jurisdictions.",
    dealEntityId: null, clientEntityId: clientOrg,
  });
  check(anon.ok && anon.consent === "anonymized", "UNCLAIMED client → anonymized automatically");
  // Now Ben claims the client org and a second story goes the pending path.
  const benClaim = await createClaim({ entityId: clientOrg, memberId: ben.id, method: "manual", evidence: "I run this bank's comms" });
  check(benClaim === "created", "client org claim files");
  const benClaimRow = (await listPendingClaims()).find((claim) => claim.entityId === clientOrg)!;
  await decideClaim(benClaimRow.id, true);
  const named = await createVendorStory({
    entityId: vendorOrg, memberId: ana.id, title: "Refinancing mandate",
    bodyMd: "Structured and negotiated a refinancing for a regional banking client with cited outcomes.",
    dealEntityId: null, clientEntityId: clientOrg,
  });
  check(named.ok && named.consent === "pending", "CLAIMED client → consent pending");
  check(
    (await listOutbox(ben.id, { unsentOnly: true })).some((item) => item.kind === "story_consent"),
    "client steward receives the consent request",
  );
  if (!named.ok || !anon.ok) {
    throw new Error("story fixtures failed");
  }
  check(!(await decideStoryConsent(named.storyId, ana.id, true)), "the VENDOR cannot grant their own consent");
  check(await decideStoryConsent(named.storyId, ben.id, true), "client steward grants naming");
  await decideStory(anon.storyId, true);
  await decideStory(named.storyId, true);
  const stories = await publishedStories(vendorOrg);
  const anonStory = stories.find((story) => story.id === anon.storyId)!;
  const namedStory = stories.find((story) => story.id === named.storyId)!;
  check(anonStory.clientDisplay === "a bank" && anonStory.clientHref === null, `anonymized renders generic ("${anonStory.clientDisplay}"), unlinked`);
  check(namedStory.clientDisplay === "Verify Platform Bank" && namedStory.clientHref !== null, "granted consent renders the NAME, linked");
  check((await listProposedStories()).every((story) => story.entityId !== vendorOrg), "published stories left the review queue");
  const declined = await createVendorStory({
    entityId: vendorOrg, memberId: ana.id, title: "Second mandate",
    bodyMd: "A second engagement for the same client with a different scope and outcome entirely.",
    dealEntityId: null, clientEntityId: clientOrg,
  });
  if (declined.ok) {
    await decideStoryConsent(declined.storyId, ben.id, false);
    await decideStory(declined.storyId, true);
    const declinedStory = (await publishedStories(vendorOrg)).find((story) => story.id === declined.storyId)!;
    check(declinedStory.clientDisplay === "a bank", "DECLINED consent → anonymized, story still publishable");
  }

  console.log("\n— API keys: hash auth + revocation + rate limit + rollups —");
  await db.execute(sql`
    INSERT INTO member_subscriptions (member_id, status, founding) VALUES (${ana.id}, 'active', true)
    ON CONFLICT (member_id) DO UPDATE SET status = 'active'
  `);
  const key = await issueApiKey(ana.id, "verify key");
  check(key.raw.startsWith("ca_live_"), "raw key format");
  const stored = await db.execute(sql`SELECT key_hash FROM api_keys WHERE id = ${key.id}`);
  check(String(stored.rows[0]!.key_hash) !== key.raw, "only the HASH is stored");
  const auth = await authenticateApiKey(key.raw);
  check(auth !== null && auth.memberId === ana.id, "bearer auth via hash lookup");
  check((await authenticateApiKey("ca_live_wrong")) === null, "wrong key refused");
  for (let i = 0; i < 5; i++) {
    check((await checkRateLimit(key.id, 5)) === (i < 5), `request ${i + 1} within limit 5`);
  }
  check(!(await checkRateLimit(key.id, 5)), "6th request in the window → 429 path");
  await recordApiUsage(key.id);
  await recordApiUsage(key.id);
  await recordApiUsage(key.id);
  const usage = await apiUsageSummary(1);
  const mine = usage.find((row) => row.keyName === "verify key");
  check(mine !== undefined && mine.count === 3, `daily rollup math (${mine?.count})`);
  check(await revokeApiKey(ana.id, key.id), "owner revokes");
  check((await authenticateApiKey(key.raw)) === null, "revoked key is dead");
  check(!(await revokeApiKey(ben.id, key.id)), "others cannot revoke your key");

  console.log("\n— endpoint inventory: no undocumented endpoints —");
  const v1Root = join(process.cwd(), "..", "..", "apps", "web", "src", "app", "api", "v1");
  const found: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}/${entry}`);
      } else if (entry === "route.ts") {
        found.push(prefix || "/");
      }
    }
  };
  walk(v1Root, "");
  const documented = ["/entities", "/entities/[slug]", "/entities/[slug]/edges", "/entities/[slug]/timeline", "/facts", "/search"];
  check(
    JSON.stringify(found.sort()) === JSON.stringify(documented.sort()),
    `v1 routes exactly match /docs/api (${found.join(", ")})`,
  );

  console.log("\n— MCP in-process round-trip (the 33D headline) —");
  const realEntity = await db.execute(sql`
    SELECT e.id, e.slug, e.name FROM entities e
    WHERE e.status = 'active' AND e.kind = 'organization'
      AND EXISTS (SELECT 1 FROM timeline_facts f WHERE f.entity_id = e.id AND f.status = 'approved')
    LIMIT 1
  `);
  const target = realEntity.rows[0]!;
  await watchEntity(ana.id, String(target.id));
  const server = createContinuumMcpServer({ memberId: ana.id });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "verify-client", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const tools = await client.listTools();
  check(tools.tools.length === 6, `6 tools listed (${tools.tools.length})`);
  check(
    tools.tools.every((tool) => tool.description !== undefined && tool.description.length > 60),
    "every tool carries an agent-grade description",
  );
  const searchResult = await client.callTool({
    name: "search_entities",
    arguments: { query: String(target.name) },
  });
  const searchPayload = JSON.parse(
    (searchResult.content as { type: string; text: string }[])[0]!.text,
  ) as { results: { slug: string; url: string }[] };
  check(
    searchPayload.results.some((row) => row.slug === String(target.slug)),
    "search_entities finds the live entity",
  );
  check(searchPayload.results.every((row) => row.url.startsWith("https://")), "results carry profile URLs");
  const entityResult = await client.callTool({ name: "get_entity", arguments: { slug: String(target.slug) } });
  const entityPayload = JSON.parse(
    (entityResult.content as { type: string; text: string }[])[0]!.text,
  ) as { name: string; stats: { facts: number } };
  check(entityPayload.name === String(target.name) && entityPayload.stats.facts > 0, "get_entity returns live cited stats");
  const timelineResult = await client.callTool({ name: "get_timeline", arguments: { slug: String(target.slug) } });
  const timelinePayload = JSON.parse(
    (timelineResult.content as { type: string; text: string }[])[0]!.text,
  ) as { facts: { source: { name: string | null } }[] };
  check(
    timelinePayload.facts.length > 0 && timelinePayload.facts.every((fact) => fact.source !== undefined),
    "get_timeline: every fact carries its source (cited shape)",
  );
  const watchlistResult = await client.callTool({ name: "my_watchlist", arguments: {} });
  const watchlistPayload = JSON.parse(
    (watchlistResult.content as { type: string; text: string }[])[0]!.text,
  ) as { watchlist: { slug: string }[] };
  check(
    watchlistPayload.watchlist.some((row) => row.slug === String(target.slug)),
    "my_watchlist is key-owner scoped",
  );
  await client.close();
  await server.close();

  console.log("\n— webhooks: signature + delivery + auto-deactivate —");
  const timestamp = Math.floor(Date.now() / 1000);
  const body = '{"events":[]}';
  const header = signWebhookPayload("whsec_test", body, timestamp);
  check(verifyWebhookSignature("whsec_test", body, header), "signature round-trip verifies");
  check(!verifyWebhookSignature("whsec_test", body + "x", header), "tampered body refused");
  check(!verifyWebhookSignature("whsec_wrong", body, header), "wrong secret refused");
  check(
    !verifyWebhookSignature("whsec_test", body, signWebhookPayload("whsec_test", body, timestamp - 3600)),
    "stale timestamp refused (replay window)",
  );
  check("error" in (await createWebhook(ana.id, "http://insecure.test", ["watchlist.fact"])), "http refused — https only");
  const hook = await createWebhook(ana.id, "https://receiver.fx.test/hook", ["watchlist.fact"]);
  check(!("error" in hook), "webhook created");
  // A pending fact lands in ana's outbox → one delivery.
  const factRow = await db.execute(sql`
    SELECT id, entity_id FROM timeline_facts WHERE status = 'approved' AND entity_id = ${String(target.id)} LIMIT 1
  `);
  await enqueueAlertsForEntities("fact", String(factRow.rows[0]!.id), [String(target.id)]);
  const received: { url: string; body: string; signature: string }[] = [];
  const okFetch: typeof fetch = async (url, init) => {
    received.push({
      url: String(url),
      body: String(init?.body ?? ""),
      signature: String((init?.headers as Record<string, string>)["x-continuum-signature"] ?? ""),
    });
    return new Response("ok", { status: 200 });
  };
  const delivery = await deliverMemberWebhooks(okFetch);
  check(delivery.delivered === 1 && received.length === 1, "one signed POST delivered");
  if (!("error" in hook)) {
    check(verifyWebhookSignature(hook.secret, received[0]!.body, received[0]!.signature), "receiver-side signature verifies");
  }
  const payload = JSON.parse(received[0]!.body) as { events: { title: string | null; url: string | null }[] };
  check(payload.events.length >= 1, "payload carries the watchlist event");
  check(!received[0]!.body.includes("@") && !received[0]!.body.includes("ca_live"), "payload holds PUBLIC record data only");
  const again = await deliverMemberWebhooks(okFetch);
  check(again.delivered === 0, "cursor advanced — nothing redelivered");
  // Auto-deactivate: force failure_count to threshold-1, then one failing pass.
  await enqueueAlertsForEntities("edge", String(factRow.rows[0]!.id), [String(target.id)]);
  await db.execute(sql`
    UPDATE member_webhooks SET failure_count = 9, delivered_through = now() - interval '1 hour',
      events = '{watchlist.fact}'::text[]
    WHERE member_id = ${ana.id}
  `);
  await enqueueAlertsForEntities("fact", String(factRow.rows[0]!.id), [String(target.id)]);
  await db.execute(sql`
    UPDATE alert_outbox SET created_at = now() WHERE member_id = ${ana.id} AND kind = 'fact'
  `);
  const failFetch: typeof fetch = async () => new Response("nope", { status: 500 });
  const failure = await deliverMemberWebhooks(failFetch);
  check(failure.deactivated === 1, "10th consecutive failure deactivates");
  check(
    (await listOutbox(ana.id, {})).some((item) => item.kind === "webhook_disabled"),
    "deactivation posts the /account/updates notice",
  );

  await cleanup();
  if (failures > 0) {
    console.error(`\nverify-platform: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-platform: PASS — claiming, vendor, API, MCP, webhooks green");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

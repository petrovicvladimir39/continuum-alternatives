import "./env";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { sitemapChunkPlan } from "@continuum/shared";
import {
  confirmByToken,
  contacts,
  db,
  eq,
  listPendingConfirmations,
  subscribeContact,
  unsubscribeByToken,
} from "@continuum/db";
import { digestAutodraftEnabled } from "./functions/digest-weekly";
import { sendConfirmationEmail } from "./subscription-email";
import { selectRecipients, type ContactRow } from "./digest";

/**
 * Verify: Phase 23 audience infrastructure — subscription state machine,
 * sitemap chunk math, OG routes, event registry, autodraft gating.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const TEST_EMAIL = "verify-audience@continuumalternatives.test";

async function cleanup(): Promise<void> {
  await db.delete(contacts).where(eq(contacts.email, TEST_EMAIL));
}

async function main(): Promise<void> {
  console.log("— subscription state machine (real DB round trip) —");
  await cleanup();

  const first = await subscribeContact(TEST_EMAIL, ["distressed"]);
  check(first.state === "pending_confirmation", "new signup → pending_confirmation");
  const token1 = first.state === "pending_confirmation" ? first.token : "";
  check(token1.length === 36, "confirmation token issued");

  // Resend-absent path: send is a graceful no-op that leaves state alone.
  const hadKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const sendResult = await sendConfirmationEmail(TEST_EMAIL, token1);
  check(sendResult === "no_resend", "without RESEND_API_KEY send reports no_resend");
  const pendingList = await listPendingConfirmations();
  check(
    pendingList.some((c) => c.email === TEST_EMAIL && c.token === token1),
    "pending contact visible to the backfill command",
  );
  // Backfill idempotency: listing repeatedly never mutates state or dupes.
  const pendingAgain = await listPendingConfirmations();
  check(
    pendingAgain.filter((c) => c.email === TEST_EMAIL).length === 1,
    "backfill listing is idempotent (single row, still pending)",
  );
  if (hadKey !== undefined) {
    process.env.RESEND_API_KEY = hadKey;
  }

  check((await confirmByToken("00000000-0000-0000-0000-000000000000")) === "invalid", "unknown token invalid");
  check((await confirmByToken(token1)) === "activated", "pending + token → active");
  check((await confirmByToken(token1)) === "already_active", "second confirm is a no-op");

  const again = await subscribeContact(TEST_EMAIL, ["pe", "distressed"]);
  check(again.state === "active", "active re-subscribe stays active (channels updated)");

  check((await unsubscribeByToken(token1)) === "unsubscribed", "one-click unsubscribe");
  check((await unsubscribeByToken(token1)) === "already_unsubscribed", "repeat unsubscribe is a no-op");
  check((await confirmByToken(token1)) === "invalid", "unsubscribed token never re-activates");

  const resub = await subscribeContact(TEST_EMAIL, ["pe"]);
  const token2 = resub.state === "pending_confirmation" ? resub.token : "";
  check(
    resub.state === "pending_confirmation" && token2 !== token1,
    "re-subscribe → pending with a ROTATED token (old links dead)",
  );
  check((await confirmByToken(token1)) === "invalid", "old token invalidated by rotation");

  // Digest recipient selection honors the state machine.
  const contactRows = await db.select().from(contacts).where(eq(contacts.email, TEST_EMAIL));
  const testRow = contactRows[0] as ContactRow;
  check(
    selectRecipients([testRow], ["pe"]).length === 0,
    "pending contact excluded from digest delivery",
  );
  check(
    selectRecipients([{ ...testRow, status: "active" }], ["pe"]).length === 1,
    "active contact included for matching channel",
  );
  await cleanup();

  console.log("\n— sitemap chunk math (10k+ fixtures) —");
  const plan = sitemapChunkPlan({ organization: 12483, fund_vehicle: 1204, deal: 37 }, 1000);
  check(plan[0]?.kind === "core", "chunk 0 is the core surfaces");
  check(plan.filter((c) => c.kind === "organization").length === 13, "12,483 orgs → 13 chunks");
  check(plan.filter((c) => c.kind === "fund_vehicle").length === 2, "1,204 funds → 2 chunks");
  check(plan.filter((c) => c.kind === "deal").length === 1, "37 deals → 1 chunk");
  check(plan.length === 17, "17 total chunk files");
  check(
    plan.every((c, i) => c.id === i),
    "chunk ids are dense and stable",
  );
  const orgChunks = plan.filter((c) => c.kind === "organization");
  check(
    orgChunks.every((c, i) => c.offset === i * 1000),
    "offsets step by chunk size",
  );
  check(sitemapChunkPlan({ organization: 0, fund_vehicle: 0, deal: 0 }).length === 1, "empty corpus → core only");
  check(sitemapChunkPlan({ organization: 1000, fund_vehicle: 0, deal: 0 }).length === 2, "exact-boundary count → single chunk");

  console.log("\n— OG image routes —");
  const webRoot = path.resolve(process.cwd(), "../..", "apps/web/src/app");
  const ogFiles = [
    "(site)/companies/[slug]/opengraph-image.tsx",
    "(site)/funds/[slug]/opengraph-image.tsx",
    "(site)/deals/[slug]/opengraph-image.tsx",
    "(site)/news/[slug]/opengraph-image.tsx",
    "(site)/reports/serbian-insolvency-monitor-q3-2026/opengraph-image.tsx",
  ];
  for (const file of ogFiles) {
    let ok = false;
    try {
      const text = readFileSync(path.join(webRoot, file), "utf8");
      ok = text.includes("contentType") && text.includes("image/png");
    } catch {
      ok = false;
    }
    check(ok, `${file} present with png contentType`);
  }
  const ogLib = readFileSync(path.resolve(webRoot, "../lib/og.tsx"), "utf8");
  check(
    !/linear-gradient|radial-gradient|conic-gradient/i.test(ogLib),
    "og layer carries no gradients (tokens only)",
  );

  console.log("\n— Plausible event registry —");
  const analytics = readFileSync(path.resolve(webRoot, "../lib/analytics.ts"), "utf8");
  const registry = [...analytics.matchAll(/"([a-z_]+)",/g)].map((m) => m[1]);
  check(registry.length === 6, `6 events registered (got ${registry.length})`);
  // Every trackEvent/TrackView usage must use a registered name.
  const used = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        const text = readFileSync(full, "utf8");
        for (const match of text.matchAll(/(?:trackEvent\(|event=)["']([a-z_]+)["']/g)) {
          used.add(match[1]!);
        }
      }
    }
  };
  walk(path.resolve(webRoot, ".."));
  const unregistered = [...used].filter((event) => !registry.includes(event));
  check(unregistered.length === 0, `all used events registered (stray: ${unregistered.join(",") || "none"})`);
  check(
    ["subscribe_submitted", "subscribe_confirmed", "report_unlocked", "article_read", "map_opened", "entity_viewed"].every(
      (event) => used.has(event),
    ),
    "all six events actually wired in the app",
  );

  console.log("\n— digest autodraft gating —");
  check(!digestAutodraftEnabled({}), "absent flag → off");
  check(!digestAutodraftEnabled({ DIGEST_AUTODRAFT: "1" }), "non-'true' value → off");
  check(!digestAutodraftEnabled({ DIGEST_AUTODRAFT: "TRUE" }), "case-sensitive: 'TRUE' → off");
  check(digestAutodraftEnabled({ DIGEST_AUTODRAFT: "true" }), "'true' → on (drafts only, never sends)");

  if (failures > 0) {
    console.error(`\nverify-audience: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-audience: PASS — audience infrastructure green");
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

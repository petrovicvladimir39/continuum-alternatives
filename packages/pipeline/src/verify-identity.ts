import "./env";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Webhook } from "svix";
import { canAccessAccount, canAccessAdmin, resolveAccessRole } from "@continuum/shared";
import {
  contacts,
  db,
  eq,
  findContactByEmail,
  getMemberByClerkId,
  memberProfiles,
  softDeleteMemberProfile,
  sql,
  upsertMemberProfile,
} from "@continuum/db";

/**
 * Verify: Phase 24 Clerk identity foundation — role gates, webhook
 * signatures (same svix scheme the route uses), soft-delete non-cascade,
 * contacts linking, appearance tokenization.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const TEST_CLERK_ID = "user_verify_identity_fixture";
const TEST_EMAIL = "verify-identity@continuumalternatives.test";

async function cleanup(): Promise<void> {
  await db.delete(memberProfiles).where(eq(memberProfiles.clerkUserId, TEST_CLERK_ID));
  await db.delete(contacts).where(eq(contacts.email, TEST_EMAIL));
}

async function main(): Promise<void> {
  console.log("— role gates (admin vs member vs anon) —");
  check(resolveAccessRole(null) === "anon", "no session → anon");
  check(resolveAccessRole({ userId: null }) === "anon", "null userId → anon");
  check(
    resolveAccessRole({ userId: "u1", publicMetadata: {} }) === "member",
    "signed-in without role → member",
  );
  check(
    resolveAccessRole({ userId: "u1", publicMetadata: { role: "editor" } }) === "member",
    "non-admin role value → member",
  );
  check(
    resolveAccessRole({ userId: "u1", publicMetadata: { role: "admin" } }) === "admin",
    "publicMetadata.role === 'admin' → admin",
  );
  check(canAccessAdmin("admin") && !canAccessAdmin("member") && !canAccessAdmin("anon"), "admin gate: admins only");
  check(canAccessAccount("member") && canAccessAccount("admin") && !canAccessAccount("anon"), "account gate: any signed-in identity");

  console.log("\n— webhook signatures (svix scheme, as the route verifies) —");
  const secret = "whsec_" + Buffer.from("verify-identity-test-secret-0123").toString("base64");
  const webhook = new Webhook(secret);
  const payload = JSON.stringify({ type: "user.created", data: { id: TEST_CLERK_ID } });
  const id = "msg_verify";
  const timestamp = new Date();
  const signature = webhook.sign(id, timestamp, payload);
  const headers = {
    "svix-id": id,
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "svix-signature": signature,
  };
  let accepted = false;
  try {
    webhook.verify(payload, headers);
    accepted = true;
  } catch {
    accepted = false;
  }
  check(accepted, "correctly signed payload verifies");
  let rejectedTamper = false;
  try {
    webhook.verify(payload.replace("user.created", "user.deleted"), headers);
  } catch {
    rejectedTamper = true;
  }
  check(rejectedTamper, "tampered payload rejected");
  let rejectedUnsigned = false;
  try {
    webhook.verify(payload, { "svix-id": id, "svix-timestamp": headers["svix-timestamp"], "svix-signature": "v1,bogus" });
  } catch {
    rejectedUnsigned = true;
  }
  check(rejectedUnsigned, "wrong signature rejected");
  const routeTs = readFileSync(
    path.resolve(process.cwd(), "../..", "apps/web/src/app/api/webhooks/clerk/route.ts"),
    "utf8",
  );
  check(routeTs.includes("invalid signature") && routeTs.includes("status: 400"), "route 400s on bad signature");
  check(routeTs.includes("status: 503"), "route 503s when secret unset");

  console.log("\n— member profile sync + soft-delete non-cascade (real DB) —");
  await cleanup();
  const before = await db.execute(sql`SELECT count(*)::int AS n FROM entities`);
  const entitiesBefore = Number(before.rows[0]?.n ?? -1);

  await upsertMemberProfile({ clerkUserId: TEST_CLERK_ID, displayName: "Verify Fixture", email: TEST_EMAIL });
  let profile = await getMemberByClerkId(TEST_CLERK_ID);
  check(profile !== null && profile.deletedAt === null, "user.created upsert creates live profile");

  await upsertMemberProfile({ clerkUserId: TEST_CLERK_ID, email: null, displayName: null });
  profile = await getMemberByClerkId(TEST_CLERK_ID);
  check(
    profile?.email === TEST_EMAIL && profile?.displayName === "Verify Fixture",
    "sparse re-sync never nulls existing fields",
  );

  check(await softDeleteMemberProfile(TEST_CLERK_ID), "user.deleted soft-deletes");
  profile = await getMemberByClerkId(TEST_CLERK_ID);
  check(profile !== null && profile.deletedAt !== null, "row survives with deleted_at set (soft)");

  const after = await db.execute(sql`SELECT count(*)::int AS n FROM entities`);
  check(Number(after.rows[0]?.n ?? -2) === entitiesBefore, "deletion cascades into NOTHING (graph untouched)");

  await upsertMemberProfile({ clerkUserId: TEST_CLERK_ID, email: TEST_EMAIL });
  profile = await getMemberByClerkId(TEST_CLERK_ID);
  check(profile?.deletedAt === null, "re-created user comes back to life");

  console.log("\n— contacts linking (member ↔ subscriber by email) —");
  await db.insert(contacts).values({ email: TEST_EMAIL, channels: ["pe"], status: "active" });
  const hit = await findContactByEmail("VERIFY-IDENTITY@ContinuumAlternatives.TEST");
  check(hit !== null && hit.email === TEST_EMAIL, "lookup is case-insensitive via lowercase normalization");
  check((await findContactByEmail("nobody@continuumalternatives.test")) === null, "no match → null (SubscribeBlock path)");
  await cleanup();

  console.log("\n— appearance tokenization (no Clerk default leaks) —");
  const appearance = readFileSync(
    path.resolve(process.cwd(), "../..", "apps/web/src/lib/clerk-appearance.ts"),
    "utf8",
  );
  // Value-position scans only — the file's own doctrine comments name the
  // forbidden things and must not self-trip the greps.
  check(
    !/#6c47ff|#7857ff|#8250df|:\s*"(?:rebecca)?purple"/i.test(appearance),
    "no Clerk default purple",
  );
  check(!/linear-gradient|radial-gradient|backgroundImage:\s*"(?!none)/i.test(appearance), "no gradients");
  const radii = [...appearance.matchAll(/borderRadius:\s*"(\d+)px"/g)].map((m) => Number(m[1]));
  check(
    radii.length > 0 && radii.every((r) => r <= 4) && !/:\s*"[^"]*rounded-xl/.test(appearance),
    "no radius above 4px",
  );
  const shadowValues = [...appearance.matchAll(/boxShadow:\s*"([^"]+)"/g)].map((m) => m[1]);
  check(shadowValues.length > 0 && shadowValues.every((v) => v === "none"), "every boxShadow forced to none");
  check(appearance.includes('colorPrimary: "#17456b"'), "accent is the primary action color");
  check(appearance.includes("var(--font-sans)"), "fonts come from the layout variables");
  for (const file of ["(site)/sign-in/[[...sign-in]]/page.tsx", "(site)/sign-up/[[...sign-up]]/page.tsx"]) {
    const text = readFileSync(path.resolve(process.cwd(), "../..", "apps/web/src/app", file), "utf8");
    check(text.includes("appearance={clerkAppearance}"), `${file.split("/")[1]} uses the tokenized appearance`);
  }

  if (failures > 0) {
    console.error(`\nverify-identity: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-identity: PASS — identity foundation green");
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});

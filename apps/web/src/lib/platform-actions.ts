"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { canExport, emailMatchesWebsite } from "@continuum/shared";
import {
  createClaim,
  createVendorStory,
  createWebhook,
  db,
  decideStoryConsent,
  deleteWebhook,
  entities,
  eq,
  getMemberByClerkId,
  getSubscription,
  isVendorOrg,
  issueApiKey,
  organizations,
  resolveMemberTier,
  revokeApiKey,
  setStewardStatement,
  stewardOf,
  suggestFieldEdit,
  upsertMemberProfile,
  upsertVendorSubscription,
  vendorActive,
  type MemberProfileRow,
} from "@continuum/db";
import { getStripe, stripeConfigured } from "@/lib/billing";

/**
 * Platform actions (Phase 33). Steward powers stay narrow: one own-voice
 * statement + review-queue suggestions — never direct record writes.
 * API keys and webhooks are founding-gated server-side.
 */

async function requireMember(): Promise<MemberProfileRow | null> {
  const { userId } = await auth();
  if (userId === null) {
    return null;
  }
  let member = await getMemberByClerkId(userId);
  if (member === null) {
    const user = await currentUser();
    member = await upsertMemberProfile({
      clerkUserId: userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      displayName: user?.firstName ?? null,
    });
  }
  return member.deletedAt === null ? member : null;
}

// ── Claiming (33A) ───────────────────────────────────────────────────────

export async function claimOrgAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "");
  const evidence = String(formData.get("evidence") ?? "").trim().slice(0, 300);
  if (member === null || entityId === "") {
    return;
  }
  const rows = await db
    .select({ kind: entities.kind, status: entities.status, website: organizations.website })
    .from(entities)
    .leftJoin(organizations, eq(organizations.entityId, entities.id))
    .where(eq(entities.id, entityId));
  const row = rows[0];
  if (row === undefined || row.kind !== "organization" || row.status !== "active") {
    return;
  }
  // Auto path: the member's sign-in email domain matches the org website.
  // Even then the claim lands PENDING — the operator confirms every steward.
  const autoMatch =
    member.email !== null && emailMatchesWebsite(member.email, row.website ?? null);
  if (!autoMatch && evidence.length < 10) {
    if (backPath.startsWith("/")) {
      redirect(`${backPath}?claim=evidence`);
    }
    return;
  }
  await createClaim({
    entityId,
    memberId: member.id,
    method: autoMatch ? "email_domain" : "manual",
    evidence: autoMatch
      ? `email domain match: ${member.email} ↔ ${row.website ?? ""}`
      : evidence,
  });
  if (backPath.startsWith("/")) {
    revalidatePath(backPath);
  }
}

export async function setStatementAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const statement = String(formData.get("statement") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "");
  if (member === null || entityId === "") {
    return;
  }
  await setStewardStatement(entityId, member.id, statement === "" ? null : statement);
  if (backPath.startsWith("/")) {
    revalidatePath(backPath);
  }
}

export async function suggestFieldAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const field = String(formData.get("field") ?? "");
  const value = String(formData.get("value") ?? "");
  const backPath = String(formData.get("backPath") ?? "");
  if (member === null || entityId === "") {
    return;
  }
  await suggestFieldEdit(entityId, member.id, field, value);
  if (backPath.startsWith("/")) {
    redirect(`${backPath}?suggested=1`);
  }
}

// ── Vendor tier (33B) ────────────────────────────────────────────────────

export async function startVendorCheckoutAction(formData: FormData): Promise<void> {
  const entityId = String(formData.get("entityId") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "/account");
  if (!stripeConfigured() || !process.env.STRIPE_PRICE_VENDOR) {
    redirect(backPath); // pre-config: the surface already says "open soon"
  }
  const member = await requireMember();
  if (member === null || entityId === "") {
    redirect(backPath);
  }
  // Vendor checkout is STEWARD-only, vendor-taggable orgs only.
  if ((await stewardOf(entityId)) !== member.id || !(await isVendorOrg(entityId))) {
    redirect(backPath);
  }
  const stripe = getStripe();
  const subscription = await getSubscription(member.id);
  let customerId = subscription?.stripeCustomerId ?? null;
  if (customerId === null) {
    const customer = await stripe.customers.create({
      ...(member.email !== null ? { email: member.email } : {}),
      metadata: { member_id: member.id },
    });
    customerId = customer.id;
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_VENDOR!, quantity: 1 }],
    success_url: `https://continuumalternatives.com${backPath}?vendor=active`,
    cancel_url: `https://continuumalternatives.com${backPath}`,
    metadata: { vendor_entity_id: entityId, member_id: member.id },
    subscription_data: { metadata: { vendor_entity_id: entityId, member_id: member.id } },
  });
  await upsertVendorSubscription({
    entityId,
    memberId: member.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: null,
    status: "incomplete",
    priceId: process.env.STRIPE_PRICE_VENDOR!,
    currentPeriodEnd: null,
  });
  redirect(session.url ?? backPath);
}

export async function createStoryAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const backPath = String(formData.get("backPath") ?? "");
  if (member === null || entityId === "") {
    return;
  }
  // BOTH prerequisites server-checked: steward + active vendor subscription.
  if ((await stewardOf(entityId)) !== member.id || !(await vendorActive(entityId))) {
    return;
  }
  const resolveSlug = async (slug: string, kinds: string[]): Promise<string | null> => {
    if (slug === "") {
      return null;
    }
    const rows = await db
      .select({ id: entities.id, kind: entities.kind, status: entities.status })
      .from(entities)
      .where(eq(entities.slug, slug));
    const row = rows[0];
    return row !== undefined && row.status === "active" && kinds.includes(row.kind) ? row.id : null;
  };
  const clientSlug = String(formData.get("clientSlug") ?? "").trim();
  const dealSlug = String(formData.get("dealSlug") ?? "").trim();
  const clientEntityId = await resolveSlug(clientSlug, ["organization"]);
  const dealEntityId = await resolveSlug(dealSlug, ["deal"]);
  if (clientSlug !== "" && clientEntityId === null) {
    redirect(`${backPath.startsWith("/") ? backPath : "/account"}?story=badclient`);
  }
  const result = await createVendorStory({
    entityId,
    memberId: member.id,
    title: String(formData.get("title") ?? ""),
    bodyMd: String(formData.get("body") ?? ""),
    dealEntityId,
    clientEntityId,
  });
  if (backPath.startsWith("/")) {
    redirect(`${backPath}?story=${result.ok ? "proposed" : "invalid"}`);
  }
}

/** The CLIENT's steward grants or declines the naming — from /account/updates. */
export async function decideStoryConsentAction(formData: FormData): Promise<void> {
  const member = await requireMember();
  const storyId = String(formData.get("storyId") ?? "").trim();
  const grant = String(formData.get("decision") ?? "") === "grant";
  if (member === null || storyId === "") {
    return;
  }
  await decideStoryConsent(storyId, member.id, grant);
  revalidatePath("/account/updates");
}

// ── API keys + webhooks (33C/E) — founding-gated ─────────────────────────

async function requireFoundingMember(): Promise<MemberProfileRow | null> {
  const member = await requireMember();
  if (member === null || !canExport(await resolveMemberTier(member.id))) {
    return null; // canExport ≙ founding — same line as the export suite
  }
  return member;
}

export async function issueKeyAction(formData: FormData): Promise<void> {
  const member = await requireFoundingMember();
  if (member === null) {
    return;
  }
  const { raw } = await issueApiKey(member.id, String(formData.get("name") ?? ""));
  // Shown ONCE via query param on the redirect — never stored in clear.
  redirect(`/account/api?created=${encodeURIComponent(raw)}`);
}

export async function revokeKeyAction(formData: FormData): Promise<void> {
  const member = await requireFoundingMember();
  const keyId = String(formData.get("keyId") ?? "").trim();
  if (member === null || keyId === "") {
    return;
  }
  await revokeApiKey(member.id, keyId);
  revalidatePath("/account/api");
}

export async function createWebhookAction(formData: FormData): Promise<void> {
  const member = await requireFoundingMember();
  if (member === null) {
    return;
  }
  const url = String(formData.get("url") ?? "").trim();
  const events = formData.getAll("events").map(String);
  const result = await createWebhook(member.id, url, events);
  if ("error" in result) {
    redirect(`/account/api?webhook=${encodeURIComponent(result.error)}`);
  }
  redirect(`/account/api?secret=${encodeURIComponent(result.secret)}`);
}

export async function deleteWebhookAction(formData: FormData): Promise<void> {
  const member = await requireFoundingMember();
  const webhookId = String(formData.get("webhookId") ?? "").trim();
  if (member === null || webhookId === "") {
    return;
  }
  await deleteWebhook(member.id, webhookId);
  revalidatePath("/account/api");
}

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { FOUNDING_ACTIVE_STATUSES, sanitizeArticleMarkdown, VENDOR_TAGS } from "@continuum/shared";
import { db } from "../client";
import {
  apiKeys,
  memberWebhooks,
  orgClaims,
  organizations,
  vendorStories,
  vendorSubscriptions,
} from "../schema";
import { publicPathFor } from "./public";
import type { EntityKind } from "./entities";

/**
 * Platform data layer (Phase 33): claiming, vendor stories, API keys,
 * usage, webhooks.
 */

// ── Claiming (33A) ───────────────────────────────────────────────────────

export type ClaimResult = "created" | "already_claimed" | "already_pending" | "invalid";

export async function createClaim(input: {
  entityId: string;
  memberId: string;
  method: "email_domain" | "manual";
  evidence: string | null;
}): Promise<ClaimResult> {
  const existing = await db
    .select({ status: orgClaims.status, memberId: orgClaims.memberId })
    .from(orgClaims)
    .where(eq(orgClaims.entityId, input.entityId));
  if (existing.some((row) => row.status === "approved")) {
    return "already_claimed";
  }
  if (existing.some((row) => row.status === "pending" && row.memberId === input.memberId)) {
    return "already_pending";
  }
  await db.insert(orgClaims).values({
    entityId: input.entityId,
    memberId: input.memberId,
    method: input.method,
    evidence: input.evidence,
  });
  return "created";
}

export type PendingClaim = {
  id: string;
  entityId: string;
  entityName: string;
  entitySlug: string;
  method: string;
  evidence: string | null;
  createdAt: Date | null;
  memberName: string;
  memberEmail: string | null;
};

/** Admin worklist — identity shown (the operator decides who stewards what). */
export async function listPendingClaims(): Promise<PendingClaim[]> {
  const result = await db.execute(sql`
    SELECT c.id, c.entity_id, c.method, c.evidence, c.created_at,
           e.name AS entity_name, e.slug AS entity_slug,
           coalesce(m.display_name, 'Member') AS member_name, m.email
    FROM org_claims c
    JOIN entities e ON e.id = c.entity_id
    JOIN member_profiles m ON m.id = c.member_id
    WHERE c.status = 'pending'
    ORDER BY c.created_at ASC
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    entityId: String(row.entity_id),
    entityName: String(row.entity_name),
    entitySlug: String(row.entity_slug),
    method: String(row.method),
    evidence: row.evidence === null ? null : String(row.evidence),
    createdAt: row.created_at === null ? null : new Date(String(row.created_at)),
    memberName: String(row.member_name),
    memberEmail: row.email === null ? null : String(row.email),
  }));
}

/** Approve/reject. The partial unique index backstops the one-steward rule. */
export async function decideClaim(claimId: string, approve: boolean): Promise<boolean> {
  const rows = await db
    .select({ entityId: orgClaims.entityId, status: orgClaims.status })
    .from(orgClaims)
    .where(eq(orgClaims.id, claimId));
  const claim = rows[0];
  if (claim === undefined || claim.status !== "pending") {
    return false;
  }
  if (approve) {
    const approved = await db
      .select({ id: orgClaims.id })
      .from(orgClaims)
      .where(and(eq(orgClaims.entityId, claim.entityId), eq(orgClaims.status, "approved")));
    if (approved.length > 0) {
      return false; // one steward per org — ever
    }
  }
  await db
    .update(orgClaims)
    .set({ status: approve ? "approved" : "rejected", decidedAt: new Date() })
    .where(eq(orgClaims.id, claimId));
  return true;
}

/** The steward = holder of the single approved claim. */
export async function stewardOf(entityId: string): Promise<string | null> {
  const rows = await db
    .select({ memberId: orgClaims.memberId })
    .from(orgClaims)
    .where(and(eq(orgClaims.entityId, entityId), eq(orgClaims.status, "approved")));
  return rows[0]?.memberId ?? null;
}

export async function memberStewardships(
  memberId: string,
): Promise<{ entityId: string; name: string; slug: string }[]> {
  const result = await db.execute(sql`
    SELECT e.id, e.name, e.slug FROM org_claims c
    JOIN entities e ON e.id = c.entity_id AND e.status = 'active'
    WHERE c.member_id = ${memberId} AND c.status = 'approved'
    ORDER BY e.name
  `);
  return result.rows.map((row) => ({
    entityId: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
  }));
}

export async function claimStateFor(
  entityId: string,
  memberId: string | null,
): Promise<"unclaimed" | "pending_mine" | "claimed_mine" | "claimed_other" | "pending_other"> {
  const rows = await db
    .select({ status: orgClaims.status, memberId: orgClaims.memberId })
    .from(orgClaims)
    .where(eq(orgClaims.entityId, entityId));
  const approved = rows.find((row) => row.status === "approved");
  if (approved !== undefined) {
    return approved.memberId === memberId ? "claimed_mine" : "claimed_other";
  }
  const pending = rows.filter((row) => row.status === "pending");
  if (memberId !== null && pending.some((row) => row.memberId === memberId)) {
    return "pending_mine";
  }
  return pending.length > 0 ? "pending_other" : "unclaimed";
}

export const STEWARD_STATEMENT_MAX = 600;

/** The ONE direct steward write — own-voice, sanitized, labeled at render. */
export async function setStewardStatement(
  entityId: string,
  memberId: string,
  statement: string | null,
): Promise<boolean> {
  if ((await stewardOf(entityId)) !== memberId) {
    return false;
  }
  const clean =
    statement === null
      ? null
      : sanitizeArticleMarkdown(statement).slice(0, STEWARD_STATEMENT_MAX) || null;
  await db
    .update(organizations)
    .set({ stewardStatement: clean })
    .where(eq(organizations.entityId, entityId));
  return true;
}

/** Whitelisted fields a steward may SUGGEST (review-queue path, 33A). */
export const STEWARD_SUGGESTABLE_FIELDS = ["founded_year", "hq_address", "aum_text", "team_size_text"] as const;

/**
 * Suggestions ride the EXISTING enrichment review lane: they land in
 * organizations.enrichment.proposed and publish only via the operator's
 * approve action. Stewards never write record data directly.
 */
export async function suggestFieldEdit(
  entityId: string,
  memberId: string,
  field: string,
  value: string,
): Promise<boolean> {
  if ((await stewardOf(entityId)) !== memberId) {
    return false;
  }
  if (!(STEWARD_SUGGESTABLE_FIELDS as readonly string[]).includes(field)) {
    return false;
  }
  const clean = value.trim().slice(0, 200);
  if (clean === "") {
    return false;
  }
  const parsed = field === "founded_year" ? Number.parseInt(clean, 10) : clean;
  if (field === "founded_year" && (!Number.isInteger(parsed) || Number(parsed) < 1600)) {
    return false;
  }
  await db.execute(sql`
    UPDATE organizations
    SET enrichment = jsonb_set(
      coalesce(enrichment, '{"overview_en":""}'::jsonb),
      '{proposed}',
      coalesce(enrichment->'proposed', '{}'::jsonb) || jsonb_build_object(${field}::text, ${JSON.stringify(parsed)}::jsonb),
      true
    )
    WHERE entity_id = ${entityId}
  `);
  return true;
}

// ── Vendor tier (33B) ────────────────────────────────────────────────────

/** Is the org vendor-taggable (carries any service-provider tag)? */
export async function isVendorOrg(entityId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1 FROM entity_tags WHERE entity_id = ${entityId}
      AND tag IN (${sql.join((VENDOR_TAGS as readonly string[]).map((tag) => sql`${tag}`), sql`, `)})
    LIMIT 1
  `);
  return result.rows.length > 0;
}

export async function upsertVendorSubscription(input: {
  entityId: string;
  memberId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  priceId: string | null;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  await db
    .insert(vendorSubscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: vendorSubscriptions.entityId,
      set: {
        memberId: input.memberId,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        status: input.status,
        priceId: input.priceId,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });
}

export async function syncVendorSubscriptionByStripeId(input: {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
}): Promise<boolean> {
  const rows = await db
    .update(vendorSubscriptions)
    .set({ status: input.status, currentPeriodEnd: input.currentPeriodEnd, updatedAt: new Date() })
    .where(eq(vendorSubscriptions.stripeSubscriptionId, input.stripeSubscriptionId))
    .returning({ entityId: vendorSubscriptions.entityId });
  return rows.length > 0;
}

export async function vendorActive(entityId: string): Promise<boolean> {
  const rows = await db
    .select({ status: vendorSubscriptions.status })
    .from(vendorSubscriptions)
    .where(eq(vendorSubscriptions.entityId, entityId));
  const status = rows[0]?.status;
  return status !== undefined && (FOUNDING_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export const STORY_TITLE_MAX = 90;

export type CreateStoryResult =
  | { ok: true; storyId: string; consent: string }
  | { ok: false; reason: string };

/**
 * Create a story (proposed). CONSENT LAW: client named only after the
 * client's steward grants it; unclaimed client → anonymized automatically;
 * the operator review gate sits on top. Both gates or no named publication.
 */
export async function createVendorStory(input: {
  entityId: string;
  memberId: string;
  title: string;
  bodyMd: string;
  dealEntityId: string | null;
  clientEntityId: string | null;
}): Promise<CreateStoryResult> {
  const title = input.title.trim();
  if (title === "" || title.length > STORY_TITLE_MAX) {
    return { ok: false, reason: `title must be 1–${STORY_TITLE_MAX} chars` };
  }
  const body = sanitizeArticleMarkdown(input.bodyMd).slice(0, 2000);
  if (body.length < 40) {
    return { ok: false, reason: "story body too short (min 40 chars)" };
  }
  let clientConsent = "none_needed";
  let clientSteward: string | null = null;
  if (input.clientEntityId !== null) {
    clientSteward = await stewardOf(input.clientEntityId);
    clientConsent = clientSteward === null ? "anonymized" : "pending";
  }
  const inserted = await db
    .insert(vendorStories)
    .values({
      entityId: input.entityId,
      createdByMemberId: input.memberId,
      title,
      bodyMd: body,
      dealEntityId: input.dealEntityId,
      clientEntityId: input.clientEntityId,
      clientConsent,
    })
    .returning({ id: vendorStories.id });
  const storyId = inserted[0]!.id;
  if (clientSteward !== null) {
    // Consent request rides the outbox to the CLIENT's steward.
    await db.execute(sql`
      INSERT INTO alert_outbox (member_id, kind, ref_id, entity_id)
      VALUES (${clientSteward}, 'story_consent', ${storyId}::uuid, ${input.clientEntityId}::uuid)
      ON CONFLICT (member_id, kind, ref_id) DO NOTHING
    `);
  }
  return { ok: true, storyId, consent: clientConsent };
}

/** The CLIENT's steward decides; decline → anonymized (never blocks the story). */
export async function decideStoryConsent(
  storyId: string,
  memberId: string,
  grant: boolean,
): Promise<boolean> {
  const rows = await db
    .select({ clientEntityId: vendorStories.clientEntityId, consent: vendorStories.clientConsent })
    .from(vendorStories)
    .where(eq(vendorStories.id, storyId));
  const story = rows[0];
  if (story === undefined || story.clientEntityId === null || story.consent !== "pending") {
    return false;
  }
  if ((await stewardOf(story.clientEntityId)) !== memberId) {
    return false;
  }
  await db
    .update(vendorStories)
    .set({ clientConsent: grant ? "granted" : "anonymized" })
    .where(eq(vendorStories.id, storyId));
  return true;
}

/** Operator gate (review queue). */
export async function decideStory(storyId: string, publish: boolean): Promise<boolean> {
  const rows = await db
    .update(vendorStories)
    .set({ status: publish ? "published" : "rejected" })
    .where(and(eq(vendorStories.id, storyId), eq(vendorStories.status, "proposed")))
    .returning({ id: vendorStories.id });
  return rows.length > 0;
}

export type StoryView = {
  id: string;
  title: string;
  bodyMd: string;
  status: string;
  clientConsent: string;
  /** Resolved at READ time: named only when consent = granted. */
  clientDisplay: string | null;
  clientHref: string | null;
  dealName: string | null;
  dealHref: string | null;
  vendorName?: string;
  createdAt: Date | null;
};

function anonymizedLabel(tag: string | null): string {
  if (tag === null) {
    return "a client organization";
  }
  return `a ${tag.replaceAll("_", " ")}`;
}

async function mapStories(whereSql: ReturnType<typeof sql>): Promise<StoryView[]> {
  const result = await db.execute(sql`
    SELECT s.id, s.title, s.body_md, s.status, s.client_consent, s.created_at,
           v.name AS vendor_name,
           c.name AS client_name, c.slug AS client_slug, c.kind AS client_kind,
           (SELECT t.tag FROM entity_tags t WHERE t.entity_id = s.client_entity_id ORDER BY t.tag LIMIT 1) AS client_tag,
           d.name AS deal_name, d.slug AS deal_slug, d.kind AS deal_kind
    FROM vendor_stories s
    JOIN entities v ON v.id = s.entity_id
    LEFT JOIN entities c ON c.id = s.client_entity_id
    LEFT JOIN entities d ON d.id = s.deal_entity_id
    WHERE ${whereSql}
    ORDER BY s.created_at DESC
  `);
  return result.rows.map((row) => {
    const named = String(row.client_consent) === "granted" && row.client_name !== null;
    return {
      id: String(row.id),
      title: String(row.title),
      bodyMd: String(row.body_md),
      status: String(row.status),
      clientConsent: String(row.client_consent),
      clientDisplay:
        row.client_name === null
          ? null
          : named
            ? String(row.client_name)
            : anonymizedLabel(row.client_tag === null ? null : String(row.client_tag)),
      clientHref:
        named && row.client_slug !== null
          ? publicPathFor(String(row.client_kind) as EntityKind, String(row.client_slug))
          : null,
      dealName: row.deal_name === null ? null : String(row.deal_name),
      dealHref:
        row.deal_slug === null
          ? null
          : publicPathFor(String(row.deal_kind) as EntityKind, String(row.deal_slug)),
      vendorName: String(row.vendor_name),
      createdAt: row.created_at === null ? null : new Date(String(row.created_at)),
    };
  });
}

/** Published stories for the vendor profile's Track record section. */
export async function publishedStories(entityId: string): Promise<StoryView[]> {
  return mapStories(sql`s.entity_id = ${entityId} AND s.status = 'published'`);
}

/** Review-queue worklist. */
export async function listProposedStories(): Promise<StoryView[]> {
  return mapStories(sql`s.status = 'proposed'`);
}

export async function storyById(storyId: string): Promise<StoryView | null> {
  const rows = await mapStories(sql`s.id = ${storyId}::uuid`);
  return rows[0] ?? null;
}

// ── API keys (33C) ───────────────────────────────────────────────────────

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Raw key returned ONCE; only the hash persists. */
export async function issueApiKey(
  memberId: string,
  name: string,
): Promise<{ id: string; raw: string }> {
  const raw = `ca_live_${randomBytes(24).toString("hex")}`;
  const rows = await db
    .insert(apiKeys)
    .values({ memberId, name: name.trim().slice(0, 60) || "API key", keyHash: hashApiKey(raw) })
    .returning({ id: apiKeys.id });
  return { id: rows[0]!.id, raw };
}

export async function revokeApiKey(memberId: string, keyId: string): Promise<boolean> {
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.memberId, memberId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  return rows.length > 0;
}

export async function listApiKeys(memberId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.memberId, memberId))
    .orderBy(desc(apiKeys.createdAt));
}

/** Bearer auth: hash lookup, revocation honored. */
export async function authenticateApiKey(
  raw: string,
): Promise<{ keyId: string; memberId: string } | null> {
  if (!raw.startsWith("ca_")) {
    return null;
  }
  const rows = await db
    .select({ id: apiKeys.id, memberId: apiKeys.memberId, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashApiKey(raw)));
  const key = rows[0];
  if (key === undefined || key.revokedAt !== null) {
    return null;
  }
  return { keyId: key.id, memberId: key.memberId };
}

export const API_RATE_LIMIT_PER_MINUTE = 60;

/**
 * Minute-window limiter, Postgres-backed. SWAP NOTE: when
 * UPSTASH_REDIS_REST_URL is configured (Phase 33+), replace this body with
 * the Upstash INCR/EXPIRE pair — the call-site contract stays identical.
 */
export async function checkRateLimit(
  keyId: string,
  limit = API_RATE_LIMIT_PER_MINUTE,
): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO api_rate_windows (key_id, window_start, count)
    VALUES (${keyId}, date_trunc('minute', now()), 1)
    ON CONFLICT (key_id, window_start) DO UPDATE SET count = api_rate_windows.count + 1
    RETURNING count
  `);
  // Opportunistic cleanup of stale windows (cheap, keyed).
  await db.execute(sql`
    DELETE FROM api_rate_windows
    WHERE key_id = ${keyId} AND window_start < now() - interval '5 minutes'
  `);
  return Number(result.rows[0]?.count ?? 1) <= limit;
}

/** Daily rollup + last_used stamp — every authenticated request lands here. */
export async function recordApiUsage(keyId: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO api_usage (key_id, day, count) VALUES (${keyId}, current_date, 1)
    ON CONFLICT (key_id, day) DO UPDATE SET count = api_usage.count + 1
  `);
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyId));
}

export async function apiUsageSummary(days = 7): Promise<
  { keyName: string; memberEmail: string | null; day: string; count: number }[]
> {
  const result = await db.execute(sql`
    SELECT k.name AS key_name, m.email, u.day::text AS day, u.count
    FROM api_usage u
    JOIN api_keys k ON k.id = u.key_id
    JOIN member_profiles m ON m.id = k.member_id
    WHERE u.day >= current_date - ${days}::int
    ORDER BY u.day DESC, k.name
  `);
  return result.rows.map((row) => ({
    keyName: String(row.key_name),
    memberEmail: row.email === null ? null : String(row.email),
    day: String(row.day),
    count: Number(row.count),
  }));
}

// ── Member webhooks (33E) ────────────────────────────────────────────────

export const WEBHOOK_EVENTS = ["watchlist.fact", "watchlist.article", "watchlist.post"] as const;
export const WEBHOOK_MAX_FAILURES = 10;

export async function createWebhook(
  memberId: string,
  url: string,
  events: string[],
): Promise<{ id: string; secret: string } | { error: string }> {
  if (!url.startsWith("https://")) {
    return { error: "https URLs only" };
  }
  const valid = events.filter((event) => (WEBHOOK_EVENTS as readonly string[]).includes(event));
  if (valid.length === 0) {
    return { error: "pick at least one event" };
  }
  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const rows = await db
    .insert(memberWebhooks)
    .values({ memberId, url: url.slice(0, 500), secret, events: valid })
    .returning({ id: memberWebhooks.id });
  return { id: rows[0]!.id, secret };
}

export async function listWebhooks(memberId: string) {
  return db
    .select({
      id: memberWebhooks.id,
      url: memberWebhooks.url,
      events: memberWebhooks.events,
      active: memberWebhooks.active,
      failureCount: memberWebhooks.failureCount,
      createdAt: memberWebhooks.createdAt,
    })
    .from(memberWebhooks)
    .where(eq(memberWebhooks.memberId, memberId))
    .orderBy(desc(memberWebhooks.createdAt));
}

export async function deleteWebhook(memberId: string, webhookId: string): Promise<boolean> {
  const rows = await db
    .delete(memberWebhooks)
    .where(and(eq(memberWebhooks.id, webhookId), eq(memberWebhooks.memberId, memberId)))
    .returning({ id: memberWebhooks.id });
  return rows.length > 0;
}

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  db,
  eq,
  listOutbox,
  memberWebhooks,
  sql,
  WEBHOOK_MAX_FAILURES,
  type OutboxItem,
} from "@continuum/db";

/**
 * Member webhook delivery (Phase 33E) — rides the alert-outbox fan-out:
 * outbox rows newer than each hook's cursor become one signed JSON POST.
 *
 * Payloads contain PUBLIC record data only (fact/article/post titles,
 * entity names, public URLs) — never private edges, contact data, or
 * anything of another member's. The outbox already enforces that: it only
 * ever holds public-record references.
 */

const EVENT_KINDS: Record<string, string> = {
  "watchlist.fact": "fact",
  "watchlist.article": "article",
  "watchlist.post": "post",
};

const KIND_EVENTS: Record<string, string> = Object.fromEntries(
  Object.entries(EVENT_KINDS).map(([event, kind]) => [kind, event]),
);

/** Stripe-style signature: t=<unix>,v1=hex(hmac_sha256(secret, "t.body")). */
export function signWebhookPayload(secret: string, body: string, timestamp: number): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/** Receiver-side verification — documented on /account/api, used in verify. */
export function verifyWebhookSignature(
  secret: string,
  body: string,
  header: string,
  toleranceSeconds = 300,
  now = Math.floor(Date.now() / 1000),
): boolean {
  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header);
  if (match === null) {
    return false;
  }
  const timestamp = Number(match[1]);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(match[2]!, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function buildWebhookPayload(items: OutboxItem[]): string {
  return JSON.stringify({
    source: "continuumalternatives.com",
    events: items.map((item) => ({
      event: KIND_EVENTS[item.kind] ?? item.kind,
      occurred_at: item.createdAt?.toISOString() ?? null,
      title: item.title,
      entity: item.entityName,
      url: item.href === null ? null : `https://continuumalternatives.com${item.href}`,
    })),
  });
}

export type WebhookDeliveryReport = {
  hooks: number;
  delivered: number;
  failed: number;
  deactivated: number;
};

const RETRIES = 3;

/**
 * One delivery pass (Inngest cron calls this; verify calls it with a mock
 * fetch). Per hook: pending outbox rows newer than the cursor → one signed
 * POST, 3 attempts. Success advances the cursor and resets failures;
 * failure increments; WEBHOOK_MAX_FAILURES consecutive → deactivate + an
 * /account/updates notice (kind 'webhook_disabled').
 */
export async function deliverMemberWebhooks(
  fetchImpl: typeof fetch = fetch,
): Promise<WebhookDeliveryReport> {
  const hooks = await db.select().from(memberWebhooks).where(eq(memberWebhooks.active, true));
  const report: WebhookDeliveryReport = { hooks: hooks.length, delivered: 0, failed: 0, deactivated: 0 };

  for (const hook of hooks) {
    const wantedKinds = hook.events
      .map((event) => EVENT_KINDS[event])
      .filter((kind): kind is string => kind !== undefined);
    if (wantedKinds.length === 0) {
      continue;
    }
    const cursor = hook.deliveredThrough ?? new Date(0);
    const items = (await listOutbox(hook.memberId, { limit: 100 })).filter(
      (item) =>
        wantedKinds.includes(item.kind) &&
        item.createdAt !== null &&
        item.createdAt.getTime() > cursor.getTime(),
    );
    if (items.length === 0) {
      continue;
    }
    const body = buildWebhookPayload(items);
    const header = signWebhookPayload(hook.secret, body, Math.floor(Date.now() / 1000));

    let ok = false;
    for (let attempt = 0; attempt < RETRIES && !ok; attempt++) {
      try {
        const response = await fetchImpl(hook.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-continuum-signature": header,
          },
          body,
        });
        ok = response.ok;
      } catch {
        ok = false;
      }
    }

    if (ok) {
      const newest = items.reduce(
        (best, item) => (item.createdAt !== null && item.createdAt > best ? item.createdAt : best),
        cursor,
      );
      await db
        .update(memberWebhooks)
        .set({ deliveredThrough: newest, failureCount: 0 })
        .where(eq(memberWebhooks.id, hook.id));
      report.delivered += 1;
    } else {
      const failures = hook.failureCount + 1;
      const deactivate = failures >= WEBHOOK_MAX_FAILURES;
      await db
        .update(memberWebhooks)
        .set({ failureCount: failures, active: !deactivate })
        .where(eq(memberWebhooks.id, hook.id));
      report.failed += 1;
      if (deactivate) {
        report.deactivated += 1;
        // Quiet notice in the member's update feed.
        await db.execute(sql`
          INSERT INTO alert_outbox (member_id, kind, ref_id)
          VALUES (${hook.memberId}, 'webhook_disabled', ${hook.id}::uuid)
          ON CONFLICT (member_id, kind, ref_id) DO NOTHING
        `);
      }
    }
  }
  return report;
}

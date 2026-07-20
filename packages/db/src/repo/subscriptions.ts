import { eq, sql } from "drizzle-orm";
import { db } from "../client";
import { contacts } from "../schema";

/**
 * Public subscription state machine (Phase 23A):
 *
 *   (new) --subscribe--> pending_confirmation --confirm(token)--> active
 *   any state --unsubscribe(token)--> unsubscribed
 *   unsubscribed/pending --subscribe again--> pending_confirmation (NEW token —
 *   old links are invalid from that moment)
 *   active --subscribe again--> stays active, channels updated (no re-confirm)
 *
 * Digest delivery reads status='active' ONLY. Consent is stored at submit
 * time (consent_source 'site' + consented_at); activation is the double
 * opt-in click. All transitions are idempotent.
 */

export type SubscribeOutcome =
  | { state: "pending_confirmation"; token: string; renewed: boolean }
  | { state: "active" };

export async function subscribeContact(
  email: string,
  channels: string[],
): Promise<SubscribeOutcome> {
  const normalized = email.trim().toLowerCase();
  const existingRows = await db.select().from(contacts).where(eq(contacts.email, normalized));
  const existing = existingRows[0];

  if (existing === undefined) {
    const inserted = await db
      .insert(contacts)
      .values({
        email: normalized,
        channels,
        consentSource: "site",
        consentedAt: new Date(),
        status: "pending_confirmation",
      })
      .returning({ token: contacts.confirmationToken });
    return { state: "pending_confirmation", token: inserted[0]!.token, renewed: false };
  }

  if (existing.status === "active") {
    // Already confirmed — a repeat submit only updates channel choices.
    await db
      .update(contacts)
      .set({ channels, consentSource: existing.consentSource ?? "site" })
      .where(eq(contacts.id, existing.id));
    return { state: "active" };
  }

  // pending_confirmation or unsubscribed (or legacy report-gate lead):
  // refresh consent, rotate the token so previously mailed links go dead.
  const updated = await db
    .update(contacts)
    .set({
      channels,
      consentSource: "site",
      consentedAt: new Date(),
      unsubscribedAt: null,
      status: "pending_confirmation",
      confirmationToken: sql`gen_random_uuid()`,
    })
    .where(eq(contacts.id, existing.id))
    .returning({ token: contacts.confirmationToken });
  return { state: "pending_confirmation", token: updated[0]!.token, renewed: true };
}

/** Double-opt-in click. Only a pending contact can activate; anything else is a no-op report. */
export async function confirmByToken(
  token: string,
): Promise<"activated" | "already_active" | "invalid"> {
  const rows = await db.select().from(contacts).where(eq(contacts.confirmationToken, token));
  const contact = rows[0];
  if (contact === undefined) {
    return "invalid";
  }
  if (contact.status === "active") {
    return "already_active";
  }
  if (contact.status !== "pending_confirmation") {
    // Unsubscribed tokens never re-activate — re-subscribing issues a new one.
    return "invalid";
  }
  await db.update(contacts).set({ status: "active" }).where(eq(contacts.id, contact.id));
  return "activated";
}

/** One-click unsubscribe — immediate, from any state. */
export async function unsubscribeByToken(
  token: string,
): Promise<"unsubscribed" | "already_unsubscribed" | "invalid"> {
  const rows = await db.select().from(contacts).where(eq(contacts.confirmationToken, token));
  const contact = rows[0];
  if (contact === undefined) {
    return "invalid";
  }
  if (contact.status === "unsubscribed") {
    return "already_unsubscribed";
  }
  await db
    .update(contacts)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(contacts.id, contact.id));
  return "unsubscribed";
}

export type PendingContact = { email: string; token: string; channels: string[] };

/** All contacts awaiting their confirmation email (for the backfill command). */
export async function listPendingConfirmations(): Promise<PendingContact[]> {
  const rows = await db
    .select({
      email: contacts.email,
      token: contacts.confirmationToken,
      channels: contacts.channels,
    })
    .from(contacts)
    .where(eq(contacts.status, "pending_confirmation"));
  return rows.map((row) => ({
    email: row.email,
    token: row.token,
    channels: row.channels ?? [],
  }));
}

export async function contactStatusSplit(): Promise<Record<string, number>> {
  const rows = await db.execute(
    sql`SELECT status, count(*)::int AS n FROM contacts GROUP BY status`,
  );
  const split: Record<string, number> = {};
  for (const row of rows.rows) {
    split[String(row.status)] = Number(row.n);
  }
  return split;
}

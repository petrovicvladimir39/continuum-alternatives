import { Resend } from "resend";
import { CLASS_ACCENTS, classifiedLabel, FOUNDING_ACTIVE_STATUSES } from "@continuum/shared";
import {
  db,
  listOutbox,
  markOutboxSent,
  membersWithPendingAlerts,
  sql,
  type OutboxItem,
} from "@continuum/db";

/**
 * Alert delivery (Phase 28C). ONE email per member per day, grouped by
 * watched entity then saved-view hits. Class kickers use the email-safe
 * accent hexes (sanctioned kicker slot). Telegram is NOT a member channel —
 * it stays an operator-only tool elsewhere in the pipeline.
 *
 * Pre-Resend the rows simply stay pending (sent_at NULL) and accumulate;
 * `pnpm alerts:backfill` delivers the backlog once RESEND_API_KEY works.
 * Per-row failures are logged and left pending for the next run.
 */

const INK = "#141311";
const INK_SECONDARY = "#5c5952";
const INK_MUTED = "#8a867c";
const LINE = "#e7e4dc";
const ACCENT = "#17456b";
const GROUND = "#fafaf8";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const ORIGIN = "https://continuumalternatives.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemHtml(item: OutboxItem): string {
  const kicker =
    item.assetClass !== null
      ? `<p style="font-family:${SANS};font-size:10px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${CLASS_ACCENTS[item.assetClass] ?? INK_MUTED};margin:10px 0 0;">${escapeHtml(classifiedLabel(item.assetClass, item.strategy))}</p>`
      : "";
  const kindLabel =
    item.kind === "article" ? "Article" : item.kind === "edge" ? "Relationship" : item.kind === "view_hit" ? "Saved view" : "Signal";
  return `${kicker}
    <p style="font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};margin:2px 0 0;">
      ${item.href !== null ? `<a href="${ORIGIN}${item.href}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(item.title ?? item.entityName ?? "Update")}</a>` : escapeHtml(item.title ?? item.entityName ?? "Update")}
    </p>
    <p style="font-family:${SANS};font-size:11px;color:${INK_MUTED};margin:0 0 6px;">${kindLabel}${item.entityName !== null ? ` · ${escapeHtml(item.entityName)}` : ""}</p>`;
}

/** Grouped: watched-entity items first (by entity), then saved-view hits. */
export function buildAlertEmail(items: OutboxItem[]): { subject: string; html: string } {
  const entityItems = items.filter((item) => item.kind !== "view_hit");
  const viewItems = items.filter((item) => item.kind === "view_hit");
  const byEntity = new Map<string, OutboxItem[]>();
  for (const item of entityItems) {
    const key = item.entityName ?? "—";
    byEntity.set(key, [...(byEntity.get(key) ?? []), item]);
  }

  const entityHtml = [...byEntity.entries()]
    .map(
      ([entityName, group]) => `
      <h2 style="font-family:${SERIF};font-weight:500;font-size:18px;color:${INK};margin:24px 0 2px;border-bottom:1px solid ${LINE};padding-bottom:5px;">${escapeHtml(entityName)}</h2>
      ${group.map(itemHtml).join("")}`,
    )
    .join("");
  const viewsHtml =
    viewItems.length > 0
      ? `<h2 style="font-family:${SERIF};font-weight:500;font-size:18px;color:${INK};margin:24px 0 2px;border-bottom:1px solid ${LINE};padding-bottom:5px;">From your saved views</h2>
        ${viewItems.map(itemHtml).join("")}`
      : "";

  const count = items.length;
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${GROUND};">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;background:${GROUND};">
    <h1 style="font-family:${SERIF};font-weight:500;font-size:24px;color:${INK};margin:0 0 4px;">Your watchlist</h1>
    <p style="font-family:${SANS};font-size:13px;color:${INK_SECONDARY};margin:0 0 6px;border-bottom:1px solid ${LINE};padding-bottom:12px;">${count} update${count === 1 ? "" : "s"} · Continuum Alternatives</p>
    ${entityHtml}
    ${viewsHtml}
    <p style="font-family:${SANS};font-size:12px;color:${INK_MUTED};margin:30px 0 0;border-top:1px solid ${LINE};padding-top:12px;">
      Manage or switch off these alerts: <a href="${ORIGIN}/account/watchlist" style="color:${ACCENT};">your watchlist settings</a>.
      <!-- Alerts opt-out lives on the PREFS page, deliberately separate from
           the newsletter unsubscribe — different consents, different lists. -->
    </p>
  </div>
</body>
</html>`;
  return {
    subject: `Watchlist: ${count} update${count === 1 ? "" : "s"}`,
    html,
  };
}

let resendClient: Resend | null = null;

export type AlertDeliveryReport = {
  mode: "sent" | "pending_no_resend";
  members: number;
  emails: number;
  failures: { memberId: string; error: string }[];
};

/** The daily batch: one email per member with pending rows; 'off' members stay pending-but-silent. */
export async function deliverPendingAlerts(): Promise<AlertDeliveryReport> {
  const worklist = await membersWithPendingAlerts();
  const report: AlertDeliveryReport = {
    mode: process.env.RESEND_API_KEY ? "sent" : "pending_no_resend",
    members: worklist.length,
    emails: 0,
    failures: [],
  };
  if (!process.env.RESEND_API_KEY) {
    return report; // rows stay pending — alerts:backfill delivers later
  }
  resendClient ??= new Resend(process.env.RESEND_API_KEY);

  for (const member of worklist) {
    if (member.frequency === "off" || member.email === null) {
      continue; // silent tiers keep their /account/updates rows only
    }
    const pending = await listOutbox(member.memberId, { unsentOnly: true, limit: 100 });
    if (pending.length === 0) {
      continue;
    }
    const { subject, html } = buildAlertEmail(pending);
    try {
      const { error } = await resendClient.emails.send({
        from: "Continuum Alternatives <alerts@continuumalternatives.com>",
        to: member.email,
        subject,
        html,
      });
      if (error) {
        report.failures.push({ memberId: member.memberId, error: error.message });
        continue; // left pending — retried next run
      }
      await markOutboxSent(pending.map((item) => item.id));
      await db.execute(sql`
        INSERT INTO member_alert_prefs (member_id, frequency, last_digested_at)
        VALUES (${member.memberId}, ${member.frequency}, now())
        ON CONFLICT (member_id) DO UPDATE SET last_digested_at = now()
      `);
      report.emails += 1;
    } catch (error) {
      report.failures.push({ memberId: member.memberId, error: String(error) });
    }
  }
  return report;
}

/**
 * Instant tier (Phase 28B): a single-item email for an important fact, only
 * to 'instant_important' members already holding the pending row. Without
 * Resend the row simply stays pending for the daily batch.
 *
 * Phase 29B: instant delivery is a FOUNDING entitlement, enforced at
 * delivery time too — a member who set instant_important while founding and
 * later downgraded degrades to the daily batch (their pref row is kept, the
 * rows stay pending; nothing is deleted).
 */
export async function sendInstantAlertsForFact(factId: string): Promise<number> {
  if (!process.env.RESEND_API_KEY) {
    return 0;
  }
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  const foundingStatuses = FOUNDING_ACTIVE_STATUSES as readonly string[];
  const result = await db.execute(sql`
    SELECT ob.id, ob.member_id, m.email
    FROM alert_outbox ob
    JOIN member_profiles m ON m.id = ob.member_id AND m.deleted_at IS NULL
    JOIN member_alert_prefs p ON p.member_id = ob.member_id AND p.frequency = 'instant_important'
    WHERE ob.kind = 'fact' AND ob.ref_id = ${factId}::uuid AND ob.sent_at IS NULL
      AND m.email IS NOT NULL
      AND EXISTS (SELECT 1 FROM member_subscriptions s
                    WHERE s.member_id = ob.member_id AND s.founding
                      AND s.status IN (${sql.join(
                        foundingStatuses.map((s) => sql`${s}`),
                        sql`, `,
                      )}))
  `);
  let sent = 0;
  for (const row of result.rows) {
    const items = (await listOutbox(String(row.member_id), { unsentOnly: true, limit: 100 })).filter(
      (item) => item.refId === factId,
    );
    if (items.length === 0) {
      continue;
    }
    const { subject, html } = buildAlertEmail(items);
    try {
      const { error } = await resendClient.emails.send({
        from: "Continuum Alternatives <alerts@continuumalternatives.com>",
        to: String(row.email),
        subject,
        html,
      });
      if (!error) {
        await markOutboxSent(items.map((item) => item.id));
        sent += 1;
      }
    } catch {
      // stays pending for the daily batch
    }
  }
  return sent;
}

import { CHANNELS } from "@continuum/shared";
import {
  alias,
  and,
  contacts,
  db,
  digestItems,
  digests,
  documents,
  entities,
  eq,
  sql,
  sources,
  timelineFacts,
} from "@continuum/db";
import { Resend } from "resend";
import { sendAlert } from "./alert";
import { buildDigestEmail } from "./digest-email";

/**
 * Deterministic digest composition — no LLM (an optional LLM-written intro is
 * BACKLOG). Digests are operator-triggered; no cron auto-sending. Audio/TTS
 * editions are deferred.
 */

export const FACT_PRIORITY: Record<string, number> = {
  insolvency_opened: 1,
  funding_round: 1,
  acquisition: 1,
  fund_close: 1,
  credit_event: 1,
  asset_sale_announced: 2,
  regulatory: 2,
  servicing_mandate: 3,
  advisor_mandate: 3,
  people_move: 3,
  other: 4,
};

export type DigestFact = {
  factId: string;
  factType: string;
  title: string;
  occurredOn: string;
  confidence: string;
  channels: string[];
  entityName: string;
  entitySlug: string;
  sourceName: string | null;
};

export type RankedItem = DigestFact & { rank: number };
export type DigestSection = { channel: string; items: RankedItem[] };
export type DigestComposition = {
  digestDate: string;
  subject: string;
  sections: DigestSection[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function digestSubject(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  return `Continuum Brief — ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Pure ranking: a multi-channel fact appears in each of its channels; within a
 * channel items sort by fact_type priority, then confidence desc, then
 * occurred_on desc; capped per channel.
 */
export function rankFacts(facts: DigestFact[], capPerChannel = 10): DigestSection[] {
  const sections: DigestSection[] = [];
  for (const channel of CHANNELS) {
    const inChannel = facts.filter((fact) => fact.channels.includes(channel));
    inChannel.sort((a, b) => {
      const priorityDelta = (FACT_PRIORITY[a.factType] ?? 4) - (FACT_PRIORITY[b.factType] ?? 4);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      const confidenceDelta = Number(b.confidence) - Number(a.confidence);
      if (confidenceDelta !== 0) {
        return confidenceDelta;
      }
      return b.occurredOn.localeCompare(a.occurredOn);
    });
    const items = inChannel
      .slice(0, capPerChannel)
      .map((fact, index) => ({ ...fact, rank: index + 1 }));
    if (items.length > 0) {
      sections.push({ channel, items });
    }
  }
  return sections;
}

/**
 * Composes a draft for `dateIso`: APPROVED facts with occurred_on inside the
 * lookback window (this 7-day window is the guard that keeps the ~600 facts of
 * historical backfill out of digest #1) that no prior digest already included.
 */
export async function composeDigest(
  dateIso: string,
  options: { lookbackDays?: number } = {},
): Promise<DigestComposition> {
  const lookbackDays = options.lookbackDays ?? 7;
  const from = new Date(`${dateIso}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - lookbackDays);
  const fromIso = from.toISOString().slice(0, 10);

  const factSource = alias(sources, "digest_fact_source");
  const factDoc = alias(documents, "digest_fact_doc");
  const rows = await db
    .select({
      factId: timelineFacts.id,
      factType: timelineFacts.factType,
      title: timelineFacts.title,
      occurredOn: timelineFacts.occurredOn,
      confidence: timelineFacts.confidence,
      channels: timelineFacts.audienceChannels,
      entityName: entities.name,
      entitySlug: entities.slug,
      sourceName: factSource.name,
    })
    .from(timelineFacts)
    .innerJoin(entities, eq(timelineFacts.entityId, entities.id))
    .leftJoin(factDoc, eq(timelineFacts.sourceDocumentId, factDoc.id))
    .leftJoin(factSource, eq(factDoc.sourceId, factSource.id))
    .where(
      and(
        eq(timelineFacts.status, "approved"),
        sql`${timelineFacts.occurredOn} > ${fromIso} AND ${timelineFacts.occurredOn} <= ${dateIso}`,
        sql`${timelineFacts.id} NOT IN (SELECT fact_id FROM digest_items WHERE included = true)`,
      ),
    );

  const facts: DigestFact[] = rows.map((row) => ({
    ...row,
    occurredOn: String(row.occurredOn),
    confidence: row.confidence,
    sourceName: row.sourceName ?? null,
  }));
  return {
    digestDate: dateIso,
    subject: digestSubject(dateIso),
    sections: rankFacts(facts),
  };
}

export async function persistDraft(composition: DigestComposition): Promise<string> {
  const inserted = await db
    .insert(digests)
    .values({
      digestDate: composition.digestDate,
      subject: composition.subject,
      status: "draft",
    })
    .returning({ id: digests.id });
  const digestId = inserted[0]?.id;
  if (digestId === undefined) {
    throw new Error("failed to insert digest");
  }
  for (const section of composition.sections) {
    for (const item of section.items) {
      await db.insert(digestItems).values({
        digestId,
        factId: item.factId,
        channel: section.channel,
        rank: item.rank,
      });
    }
  }
  return digestId;
}

export type ContactRow = typeof contacts.$inferSelect;

/** Non-unsubscribed contacts whose channels intersect the digest's channels. */
export function selectRecipients(
  allContacts: ContactRow[],
  digestChannels: string[],
): ContactRow[] {
  return allContacts.filter(
    (contact) =>
      contact.unsubscribedAt === null &&
      (contact.channels ?? []).some((channel) => digestChannels.includes(channel)),
  );
}

export type DeliveryReport = {
  telegram: "sent" | "no-op";
  email: {
    status: "sent" | "partial" | "skipped";
    sent: number;
    failed: { email: string; error: string }[];
    reason?: string;
  };
};

/** Loads the persisted (included) items of a digest as renderable sections. */
export async function loadDigestSections(digestId: string): Promise<DigestSection[]> {
  const factSource = alias(sources, "load_fact_source");
  const factDoc = alias(documents, "load_fact_doc");
  const rows = await db
    .select({
      channel: digestItems.channel,
      rank: digestItems.rank,
      factId: timelineFacts.id,
      factType: timelineFacts.factType,
      title: timelineFacts.title,
      occurredOn: timelineFacts.occurredOn,
      confidence: timelineFacts.confidence,
      channels: timelineFacts.audienceChannels,
      entityName: entities.name,
      entitySlug: entities.slug,
      sourceName: factSource.name,
    })
    .from(digestItems)
    .innerJoin(timelineFacts, eq(digestItems.factId, timelineFacts.id))
    .innerJoin(entities, eq(timelineFacts.entityId, entities.id))
    .leftJoin(factDoc, eq(timelineFacts.sourceDocumentId, factDoc.id))
    .leftJoin(factSource, eq(factDoc.sourceId, factSource.id))
    .where(and(eq(digestItems.digestId, digestId), eq(digestItems.included, true)));

  const sections: DigestSection[] = [];
  for (const channel of CHANNELS) {
    const items = rows
      .filter((row) => row.channel === channel)
      .sort((a, b) => a.rank - b.rank)
      .map((row) => ({
        ...row,
        occurredOn: String(row.occurredOn),
        sourceName: row.sourceName ?? null,
      }));
    if (items.length > 0) {
      sections.push({ channel, items });
    }
  }
  return sections;
}

let resendClient: Resend | null = null;

export async function deliverDigest(digestId: string): Promise<DeliveryReport> {
  const digestRows = await db.select().from(digests).where(eq(digests.id, digestId));
  const digest = digestRows[0];
  if (!digest) {
    throw new Error(`Unknown digest id: ${digestId}`);
  }
  const sections = await loadDigestSections(digestId);
  const digestChannels = sections.map((section) => section.channel);
  const itemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  const archiveUrl = `https://continuumalternatives.com/digest/${String(digest.digestDate)}`;

  // Telegram summary (no-op without token/chat, as everywhere).
  const telegramConfigured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID,
  );
  await sendAlert(
    `Continuum Brief ${String(digest.digestDate)}: ${itemCount} items across ${digestChannels.length} channels → ${archiveUrl}`,
  );

  const report: DeliveryReport = {
    telegram: telegramConfigured ? "sent" : "no-op",
    email: { status: "skipped", sent: 0, failed: [] },
  };

  if (!process.env.RESEND_API_KEY) {
    report.email.reason = "RESEND_API_KEY not set";
    return report;
  }
  const allContacts = await db.select().from(contacts);
  const recipients = selectRecipients(allContacts, digestChannels);
  if (recipients.length === 0) {
    report.email.status = "sent";
    report.email.reason = "no matching subscribers";
    return report;
  }

  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  for (const recipient of recipients) {
    const { html } = buildDigestEmail(
      { digestDate: String(digest.digestDate), subject: digest.subject ?? "", sections },
      recipient.channels ?? [],
    );
    try {
      const { error } = await resendClient.emails.send({
        from: "Continuum Alternatives <digest@continuumalternatives.com>",
        to: recipient.email,
        subject: digest.subject ?? "Continuum Brief",
        html,
      });
      if (error) {
        report.email.failed.push({ email: recipient.email, error: error.message });
      } else {
        report.email.sent += 1;
      }
    } catch (err) {
      report.email.failed.push({
        email: recipient.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  report.email.status = report.email.failed.length === 0 ? "sent" : "partial";
  return report;
}

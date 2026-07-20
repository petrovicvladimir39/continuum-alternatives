import { db, edges, eq, sql, timelineFacts } from "@continuum/db";

/** Current review-queue backlog, for the one-per-run Telegram summary. */
export async function pendingCounts(): Promise<{ facts: number; edges: number }> {
  const factRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(timelineFacts)
    .where(eq(timelineFacts.status, "proposed"));
  const edgeRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(edges)
    .where(eq(edges.status, "proposed"));
  return { facts: factRows[0]?.n ?? 0, edges: edgeRows[0]?.n ?? 0 };
}

/**
 * One summary message per run that added proposed items — never per item.
 * Same no-op fallback as sendAlert when Telegram is unconfigured.
 */
export async function notifyQueue(counts: { facts: number; edges: number }): Promise<void> {
  await sendAlert(
    `Review queue: ${counts.facts} facts, ${counts.edges} edges pending → https://continuumalternatives.com/admin/review`,
  );
}

/**
 * Sends a plain-text Telegram alert to TELEGRAM_CHAT_ID. When the bot token or
 * chat id is unset (e.g. local dev), logs a console.warn and no-ops.
 */
export async function sendAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn(`[alert no-op — telegram unset] ${text}`);
    return;
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) {
    console.warn(`telegram alert failed: HTTP ${response.status}`);
  }
}

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

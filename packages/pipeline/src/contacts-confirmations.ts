import "./env";
import { listPendingConfirmations } from "@continuum/db";
import { sendConfirmationEmail } from "./subscription-email";

/**
 * Confirmation backfill (Phase 23A):
 *
 *   pnpm contacts:send-confirmations
 *
 * Sends the double-opt-in email to every contact stuck in
 * pending_confirmation — the catch-up path for signups collected while
 * RESEND_API_KEY was absent or the domain unverified. Idempotent on state:
 * contacts stay pending until THEY click; re-running only re-mails the same
 * stable tokens (no duplicates created, no status flips).
 */
async function main(): Promise<void> {
  const pending = await listPendingConfirmations();
  console.log(`contacts:send-confirmations — ${pending.length} pending contact(s)`);
  if (pending.length === 0) {
    process.exit(0);
  }
  if (!process.env.RESEND_API_KEY) {
    console.log(
      "RESEND_API_KEY is not set — nothing sent. Configure Resend (and verify the\n" +
        "sending domain) then re-run; every pending contact will get their\n" +
        "confirmation email with the same token links.",
    );
    process.exit(0);
  }
  let sent = 0;
  let failed = 0;
  for (const contact of pending) {
    const result = await sendConfirmationEmail(contact.email, contact.token);
    if (result === "sent") {
      sent += 1;
    } else {
      failed += 1;
      console.log(`  failed: ${contact.email} (${result})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  console.log(`done — sent ${sent}, failed ${failed}, still pending until each contact confirms`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

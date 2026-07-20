import "./env";
import { deliverPendingAlerts } from "./alerts";

/**
 * Alert backfill (Phase 28C):
 *
 *   pnpm alerts:backfill
 *
 * Sends every accumulated pending outbox row once Resend is configured —
 * the same pending+backfill pattern as contacts:send-confirmations.
 */
async function main(): Promise<void> {
  const report = await deliverPendingAlerts();
  if (report.mode === "pending_no_resend") {
    console.log(
      `alerts:backfill — RESEND_API_KEY not set; ${report.members} member(s) hold pending rows.\n` +
        "Configure Resend and re-run; nothing was sent and nothing was lost.",
    );
  } else {
    console.log(
      `alerts:backfill — ${report.emails} email(s) sent to ${report.members} member(s); failures: ${report.failures.length}`,
    );
    for (const failure of report.failures) {
      console.log(`  retry next run: ${failure.memberId} (${failure.error})`);
    }
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

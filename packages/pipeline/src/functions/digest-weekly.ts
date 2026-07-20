import { inngest } from "../inngest";
import { composeDigest, persistDraft } from "../digest";
import { sendAlert } from "../alert";

/**
 * Weekly digest DRAFT cron (Phase 23D) — Mondays 05:30 UTC.
 *
 * Generates and persists the draft ONLY. Sending remains manual-approve
 * FOREVER — the operator reviews in /admin/digests and presses send; no
 * code path here (or anywhere) emails subscribers automatically.
 *
 * Ships behind DIGEST_AUTODRAFT=true (absent = off) so cadence is a
 * deliberate operator decision, not a deploy side effect.
 */

/** Pure gate — fixture-tested in verify-audience. */
export function digestAutodraftEnabled(env: Record<string, string | undefined>): boolean {
  return env.DIGEST_AUTODRAFT === "true";
}

export const digestWeeklyDraft = inngest.createFunction(
  { id: "digest-weekly-draft" },
  { cron: "30 5 * * 1" },
  async ({ step }) => {
    if (!digestAutodraftEnabled(process.env)) {
      return { skipped: true, reason: "DIGEST_AUTODRAFT is not 'true' — autodraft is off" };
    }
    const digestId = await step.run("compose-and-persist-draft", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const composition = await composeDigest(today);
      return persistDraft(composition);
    });
    await step.run("notify-operator", async () => {
      // Telegram when configured, console always (sendAlert handles both).
      await sendAlert("Weekly digest draft ready → /admin/digests");
      console.log(`digest-weekly-draft: draft ${digestId} ready → /admin/digests`);
    });
    return { skipped: false, digestId };
  },
);

import { inngest } from "../inngest";
import { deliverMemberWebhooks } from "../webhooks";

/**
 * Webhook delivery cron (Phase 33E) — every 15 minutes, one pass over
 * active member webhooks. Near-real-time is honest enough for watchlist
 * events; instant delivery would need per-enqueue triggers (later, if
 * demand justifies).
 */
export const webhooksDeliver = inngest.createFunction(
  { id: "webhooks-deliver", retries: 1 },
  { cron: "*/15 * * * *" },
  async () => {
    const report = await deliverMemberWebhooks();
    return report;
  },
);

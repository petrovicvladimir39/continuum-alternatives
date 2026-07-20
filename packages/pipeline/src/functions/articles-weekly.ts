import { inngest } from "../inngest";

/**
 * Weekly News Desk compose trigger (reset build Part 6) — SHIPS DISABLED.
 *
 * Composition costs LLM tokens and creates review work; running it on a
 * schedule is an operator decision. Enable by setting
 * ARTICLES_WEEKLY_ENABLED=1 in the environment — until then every firing
 * exits immediately without touching the model. Even when enabled, compose
 * only ever creates status='proposed' drafts; publication stays human.
 */
export const articlesWeekly = inngest.createFunction(
  { id: "articles-weekly" },
  { cron: "0 6 * * 1" }, // Mondays 06:00 UTC
  async ({ step }) => {
    if (process.env.ARTICLES_WEEKLY_ENABLED !== "1") {
      return { skipped: true, reason: "ARTICLES_WEEKLY_ENABLED is not set — trigger ships disabled" };
    }
    // Deliberately NOT importing the compose path here yet: the scheduled
    // body runs the same grouping+guards as `pnpm articles:compose`. Until
    // the operator enables the flag, this function is a no-op shell.
    await step.run("noop", async () => null);
    return { skipped: false, note: "enable-flag set; run pnpm articles:compose manually for now" };
  },
);

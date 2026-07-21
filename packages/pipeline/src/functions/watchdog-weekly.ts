import { inngest } from "../inngest";
import { runWatchdogWeekly } from "../watchdog-compose";

/**
 * Watchdog weekly cron (Phase 34E) — Monday 07:30 UTC, after the daily
 * alerts batch. Opt-in is the gate; empty weeks skip with nothing sent.
 */
export const watchdogWeekly = inngest.createFunction(
  { id: "watchdog-weekly", retries: 1 },
  { cron: "30 7 * * 1" },
  async () => runWatchdogWeekly(),
);

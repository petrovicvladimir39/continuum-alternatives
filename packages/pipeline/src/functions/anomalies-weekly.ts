import { notifyAnomalies, scanAnomalies } from "../anomalies";
import { inngest } from "../inngest";

/** Weekly anomaly scan, Mondays 06:00 — deterministic math, no LLM. */
export const anomaliesWeekly = inngest.createFunction(
  { id: "anomalies-weekly" },
  { cron: "0 6 * * 1" },
  async ({ step }) => {
    const result = await step.run("scan", () => scanAnomalies());
    await step.run("notify", () => notifyAnomalies(result));
    return { evaluated: result.evaluated, flagged: result.flagged.length, new: result.newCount };
  },
);

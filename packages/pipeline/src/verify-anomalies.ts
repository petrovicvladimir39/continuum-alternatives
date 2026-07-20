import "./env";
import { anomalies, db, eq, like } from "@continuum/db";
import { bucketWeekly, detectAnomalies, isoWeekStart } from "./anomalies";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

/** Builds a series map from per-week counts, ending at the evaluated week. */
function seriesFrom(counts: number[], asOf: Date): Map<string, number> {
  const series = new Map<string, number>();
  const evaluated = new Date(asOf);
  evaluated.setUTCDate(evaluated.getUTCDate() - 7);
  let cursor = isoWeekStart(evaluated);
  for (let i = counts.length - 1; i >= 0; i -= 1) {
    series.set(cursor, counts[i] ?? 0);
    const prev = new Date(`${cursor}T00:00:00Z`);
    prev.setUTCDate(prev.getUTCDate() - 7);
    cursor = prev.toISOString().slice(0, 10);
  }
  return series;
}

async function cleanup() {
  await db.delete(anomalies).where(like(anomalies.dimensionKey, "cli-test-%"));
}

async function main() {
  const asOf = new Date("2026-07-20T12:00:00Z");

  console.log("— iso week bucketing —");
  check(isoWeekStart(new Date("2026-07-20T12:00:00Z")) === "2026-07-20", "Monday maps to itself");
  check(
    isoWeekStart(new Date("2026-07-26T12:00:00Z")) === "2026-07-20",
    "Sunday maps back to Monday",
  );
  const buckets = bucketWeekly(["2026-07-20", "2026-07-22", "2026-07-13"]);
  check(
    buckets.get("2026-07-20") === 2 && buckets.get("2026-07-13") === 1,
    "bucketWeekly counts per ISO week",
  );

  console.log("\n— detection —");
  // Clear spike: baseline mean 5/week, evaluated week 20.
  const spike = detectAnomalies(seriesFrom([5, 5, 6, 4, 5, 5, 6, 4, 5, 5, 6, 4, 20], asOf), {
    asOf,
  });
  check(spike.flagged, `clear spike flags (z=${spike.z.toFixed(2)})`);
  check(spike.z >= 2.5, "spike z at or above threshold");
  check(
    spike.observed === 20 && spike.week === "2026-07-13",
    "evaluates most recent COMPLETE week",
  );

  // Flat series: nothing flags.
  const flat = detectAnomalies(seriesFrom([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], asOf), { asOf });
  check(!flat.flagged, `flat series does not flag (z=${flat.z.toFixed(2)})`);

  // Low-baseline suppression: mean 1/week with a spike to 5 — z is huge but suppressed.
  const tinyCourt = detectAnomalies(seriesFrom([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5], asOf), {
    asOf,
  });
  check(
    tinyCourt.z >= 2.5 && !tinyCourt.flagged,
    `low-baseline spike suppressed despite z=${tinyCourt.z.toFixed(2)} (mean ${tinyCourt.mean.toFixed(2)} < 3)`,
  );

  // std floor: identical baseline values → variance 0 → std floored to 0.5.
  const floored = detectAnomalies(seriesFrom([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6], asOf), {
    asOf,
  });
  check(floored.std === 0.5, `std floored at 0.5 (got ${floored.std})`);
  check(floored.flagged, "spike over floored std flags");

  console.log("\n— upsert idempotency —");
  await cleanup();
  const values = {
    dimension: "cli-test-dim",
    dimensionKey: "cli-test-key",
    periodWeek: "2026-07-13",
    observed: 20,
    baselineMean: "5.00",
    baselineStd: "0.71",
    z: "21.21",
  };
  await db.insert(anomalies).values(values);
  await db
    .insert(anomalies)
    .values({ ...values, observed: 21, z: "22.63" })
    .onConflictDoUpdate({
      target: [anomalies.dimension, anomalies.dimensionKey, anomalies.periodWeek],
      set: { observed: 21, z: "22.63" },
    });
  const rows = await db.select().from(anomalies).where(eq(anomalies.dimensionKey, "cli-test-key"));
  check(rows.length === 1, `re-scan upserts, never duplicates (${rows.length} row)`);
  check(rows[0]?.observed === 21 && rows[0]?.z === "22.63", "upsert refreshed values");
  check(rows[0]?.status === "new", "status untouched by upsert");
  await cleanup();
  const leftover = await db
    .select()
    .from(anomalies)
    .where(like(anomalies.dimensionKey, "cli-test-%"));
  check(leftover.length === 0, "cleanup removed fixtures");

  if (failures > 0) {
    console.error(`\nverify-anomalies: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-anomalies: PASS — anomaly detection checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

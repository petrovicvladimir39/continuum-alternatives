import { normalizeAlias } from "@continuum/shared";
import { anomalies, db, eq, sql, timelineFacts } from "@continuum/db";
import { sendAlert } from "./alert";

/**
 * Deterministic statistical anomaly detection over weekly fact series.
 * No LLM anywhere. Anomalies are NOT facts and never auto-publish — Phase 13's
 * digest engine decides how they surface editorially.
 */

export type WeekPoint = { week: string; count: number };

export type AnomalyVerdict = {
  week: string;
  observed: number;
  mean: number;
  std: number;
  z: number;
  flagged: boolean;
};

export type DetectOptions = {
  window?: number;
  zThreshold?: number;
  minBaselineMean?: number;
  asOf?: Date;
};

/** Monday of the ISO week containing the date, as YYYY-MM-DD (UTC). */
export function isoWeekStart(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return utc.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Buckets ISO dates into ISO-week counts. */
export function bucketWeekly(dates: string[]): Map<string, number> {
  const buckets = new Map<string, number>();
  for (const iso of dates) {
    const week = isoWeekStart(new Date(`${iso}T00:00:00Z`));
    buckets.set(week, (buckets.get(week) ?? 0) + 1);
  }
  return buckets;
}

/**
 * Evaluates the most recent COMPLETE week against a rolling baseline of the
 * prior `window` weeks (missing weeks count 0). std has a 0.5 floor to avoid
 * dividing by noise; low-baseline series (mean < minBaselineMean) never flag.
 */
export function detectAnomalies(
  series: Map<string, number>,
  options: DetectOptions = {},
): AnomalyVerdict {
  const window = options.window ?? 12;
  const zThreshold = options.zThreshold ?? 2.5;
  const minBaselineMean = options.minBaselineMean ?? 3;
  const asOf = options.asOf ?? new Date();

  const currentWeek = isoWeekStart(asOf);
  const evaluatedWeek = addDays(currentWeek, -7);
  const observed = series.get(evaluatedWeek) ?? 0;

  const baseline: number[] = [];
  for (let i = 1; i <= window; i += 1) {
    baseline.push(series.get(addDays(evaluatedWeek, -7 * i)) ?? 0);
  }
  const mean = baseline.reduce((sum, value) => sum + value, 0) / window;
  const variance = baseline.reduce((sum, value) => sum + (value - mean) ** 2, 0) / window;
  const std = Math.max(Math.sqrt(variance), 0.5);
  const z = (observed - mean) / std;

  return {
    week: evaluatedWeek,
    observed,
    mean,
    std,
    z,
    flagged: z >= zThreshold && mean >= minBaselineMean,
  };
}

export type SeriesGroup = {
  dimension: string;
  dimensionKey: string;
  series: Map<string, number>;
};

/** Weekly series of APPROVED facts: overall per fact_type + per-court cases. */
export async function buildSeriesGroups(): Promise<SeriesGroup[]> {
  const rows = await db
    .select({
      factType: timelineFacts.factType,
      occurredOn: timelineFacts.occurredOn,
      court: sql<string | null>`${timelineFacts.data}->>'court'`,
    })
    .from(timelineFacts)
    .where(eq(timelineFacts.status, "approved"));

  const overall = new Map<string, string[]>();
  const byCourt = new Map<string, { display: string; dates: string[] }>();
  for (const row of rows) {
    if (row.factType === "insolvency_opened" || row.factType === "asset_sale_announced") {
      const dates = overall.get(row.factType) ?? [];
      dates.push(String(row.occurredOn));
      overall.set(row.factType, dates);
    }
    if (row.factType === "insolvency_opened" && row.court !== null && row.court !== "") {
      // Group on the normalized form; keep it as the stable dimension key.
      const key = normalizeAlias(row.court);
      const entry = byCourt.get(key) ?? { display: row.court, dates: [] };
      entry.dates.push(String(row.occurredOn));
      byCourt.set(key, entry);
    }
  }

  const groups: SeriesGroup[] = [];
  for (const [factType, dates] of overall) {
    groups.push({ dimension: factType, dimensionKey: "all", series: bucketWeekly(dates) });
  }
  for (const [key, entry] of byCourt) {
    groups.push({
      dimension: "insolvency_court",
      dimensionKey: key,
      series: bucketWeekly(entry.dates),
    });
  }
  return groups;
}

export type ScanResult = {
  evaluated: number;
  flagged: { dimension: string; dimensionKey: string; week: string; z: number; observed: number }[];
  newCount: number;
};

/** Runs detection over all series and upserts flagged anomalies (idempotent). */
export async function scanAnomalies(options: DetectOptions = {}): Promise<ScanResult> {
  const groups = await buildSeriesGroups();
  const flagged: ScanResult["flagged"] = [];
  let newCount = 0;

  for (const group of groups) {
    const verdict = detectAnomalies(group.series, options);
    if (!verdict.flagged) {
      continue;
    }
    const values = {
      dimension: group.dimension,
      dimensionKey: group.dimensionKey,
      periodWeek: verdict.week,
      observed: verdict.observed,
      baselineMean: verdict.mean.toFixed(2),
      baselineStd: verdict.std.toFixed(2),
      z: verdict.z.toFixed(2),
    };
    const upserted = await db
      .insert(anomalies)
      .values(values)
      .onConflictDoUpdate({
        target: [anomalies.dimension, anomalies.dimensionKey, anomalies.periodWeek],
        set: {
          observed: values.observed,
          baselineMean: values.baselineMean,
          baselineStd: values.baselineStd,
          z: values.z,
        },
      })
      .returning({ status: anomalies.status, createdAt: anomalies.createdAt });
    if (upserted[0]?.status === "new") {
      newCount += 1;
    }
    flagged.push({
      dimension: group.dimension,
      dimensionKey: group.dimensionKey,
      week: verdict.week,
      z: Number(verdict.z.toFixed(2)),
      observed: verdict.observed,
    });
  }
  return { evaluated: groups.length, flagged, newCount };
}

/** One Telegram summary per scan that found anything new. */
export async function notifyAnomalies(result: ScanResult): Promise<void> {
  if (result.newCount === 0) {
    return;
  }
  const top = [...result.flagged].sort((a, b) => b.z - a.z)[0];
  await sendAlert(
    `Anomaly scan: ${result.newCount} new (top: ${top?.dimensionKey ?? "?"} z=${top?.z ?? "?"})`,
  );
}

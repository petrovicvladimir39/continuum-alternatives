import { inngest } from "../inngest";
import { capViewHits } from "@continuum/shared";
import { db, enqueueViewHits, listAskFeed, sql } from "@continuum/db";
import { deliverPendingAlerts } from "../alerts";

/**
 * Daily alerts (Phase 28C) — 07:00 UTC.
 * 1. Evaluate every alert-enabled saved view against the last 24h of new
 *    items → view_hit outbox rows (cap 20/view/day, idempotent per ref).
 * 2. Deliver ONE batched email per member with pending rows.
 * Pre-Resend delivery is a graceful no-op (rows stay pending).
 */

type StoredFilters = {
  channels?: string[];
  countries?: string[];
  factTypes?: string[];
  strategies?: string[];
  assetClasses?: string[];
  freeText?: string;
};

export async function evaluateAlertViews(): Promise<{ views: number; hits: number }> {
  const views = await db.execute(sql`
    SELECT v.id, v.member_id, v.filters
    FROM member_saved_views v
    JOIN member_profiles m ON m.id = v.member_id AND m.deleted_at IS NULL
    WHERE v.alert_enabled = true
  `);
  let hits = 0;
  for (const row of views.rows) {
    const filters = (row.filters ?? {}) as StoredFilters;
    const feed = await listAskFeed({
      channels: filters.channels ?? [],
      countries: filters.countries ?? [],
      factTypes: filters.factTypes ?? [],
      strategies: filters.strategies ?? [],
      assetClasses: filters.assetClasses ?? [],
      ...(filters.freeText ? { entityQuery: filters.freeText } : {}),
      recordedWithinHours: 24,
      limit: 20,
    });
    const capped = capViewHits(feed.items, 20); // hard 20/view/day
    hits += await enqueueViewHits(
      String(row.member_id),
      capped.map((item) => item.id),
    );
  }
  return { views: views.rows.length, hits };
}

export const alertsDaily = inngest.createFunction(
  { id: "alerts-daily" },
  { cron: "0 7 * * *" },
  async ({ step }) => {
    const evaluated = await step.run("evaluate-saved-views", evaluateAlertViews);
    const delivery = await step.run("deliver-batches", deliverPendingAlerts);
    return { evaluated, delivery };
  },
);

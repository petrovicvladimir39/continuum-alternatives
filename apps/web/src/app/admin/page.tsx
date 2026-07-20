import Link from "next/link";
import { apiUsageSummary, briefTelemetry } from "@continuum/db";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  // Phase 29D cost telemetry — deterministic sums from the generation log.
  const briefs = await briefTelemetry();
  // Phase 33E: API usage rollups (last 7 days). Stripe metered reporting is
  // an operator decision later — log-only until STRIPE_METER_* envs land.
  const usage = await apiUsageSummary(7);
  return (
    <div>
      <h1 className="type-h2">Admin</h1>
      <p className="mt-2 max-w-xl text-ink-secondary">
        Working surface for the Continuum Alternatives universe. Entities, edges and timeline facts
        are managed from entity pages; proposed items await decisions in Review.
      </p>
      <ul className="mt-6 space-y-2 text-[13px]">
        <li>
          <Link href="/admin/entities" className="text-accent hover:underline">
            Entities
          </Link>{" "}
          — search, create and edit universe entries
        </li>
        <li>
          <Link href="/admin/review" className="text-accent hover:underline">
            Review
          </Link>{" "}
          — approve or reject proposed edges and facts
        </li>
      </ul>

      <h2 className="type-h2 mt-8">Entity briefs — model spend</h2>
      <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2 border border-line p-4 text-[13px]">
        <p>
          <span className="type-data font-medium">${briefs.today.usd.toFixed(4)}</span>
          <span className="text-ink-muted"> today · {briefs.today.generations} generation(s), $2.00 daily guard</span>
        </p>
        <p>
          <span className="type-data font-medium">${briefs.month.usd.toFixed(4)}</span>
          <span className="text-ink-muted"> this month · {briefs.month.generations} generation(s)</span>
        </p>
        <p>
          <span className="type-data font-medium">${briefs.total.usd.toFixed(4)}</span>
          <span className="text-ink-muted"> all-time · {briefs.cachedBriefs} cached brief(s)</span>
        </p>
      </div>

      <h2 className="type-h2 mt-8">API usage — last 7 days</h2>
      {usage.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">No API calls yet.</p>
      ) : (
        <table className="mt-2 w-full max-w-xl text-[13px]">
          <tbody>
            {usage.map((row) => (
              <tr key={`${row.keyName}-${row.day}`} className="border-t border-line">
                <td className="type-data py-1">{row.day}</td>
                <td>{row.keyName}</td>
                <td className="text-ink-muted">{row.memberEmail ?? "—"}</td>
                <td className="type-data text-right">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

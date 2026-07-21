import { opsCounts, opsSourceFreshness } from "@continuum/db";
import { DataTable, numericCell } from "@/components/ui/data-table";

export const dynamic = "force-dynamic";

/**
 * /admin/ops (Phase 34F) — ONE operator dashboard: source freshness with
 * docs/day sparklines, LLM spend rollups, outbox backlog, webhook
 * failures, row counts. Token-only SVG; no chart libraries.
 */

function Sparkline({ values }: { values: number[] }) {
  const width = 84;
  const height = 18;
  const max = Math.max(...values, 1);
  const barWidth = width / Math.max(values.length, 1);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[18px] w-[84px]" aria-hidden>
      {values.map((value, index) => {
        const barHeight = Math.max(value > 0 ? 2 : 0, (value / max) * height);
        return (
          <rect
            key={index}
            x={index * barWidth + 0.5}
            y={height - barHeight}
            width={barWidth - 1}
            height={barHeight}
            fill="currentColor"
            className="text-accent"
          />
        );
      })}
    </svg>
  );
}

const USD = (value: number) => `$${value.toFixed(4)}`;

export default async function OpsPage() {
  const [sources, counts] = await Promise.all([opsSourceFreshness(), opsCounts()]);
  const staleness = (lastRunAt: Date | null): string => {
    if (lastRunAt === null) {
      return "never";
    }
    const days = Math.floor((Date.now() - lastRunAt.getTime()) / 86_400_000);
    return days === 0 ? "today" : `${days}d ago`;
  };

  return (
    <div>
      <h1 className="type-h2">Ops</h1>
      <p className="mt-2 max-w-xl text-[13px] text-ink-secondary">
        Freshness, spend, and backlog at a glance. Backup verification runs from the CLI:{" "}
        <code className="type-data border border-line bg-surface px-1">pnpm ops:backup-check</code>{" "}
        — runbook in docs/RUNBOOK.md.
      </p>

      <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
        <div>
          <div className="type-data text-[20px] font-medium">{counts.outboxPending}</div>
          <div className="type-label mt-0.5">Outbox pending</div>
        </div>
        <div>
          <div className="type-data text-[20px] font-medium">{counts.webhookFailures}</div>
          <div className="type-label mt-0.5">Webhook failure count</div>
        </div>
        {counts.llmSpend.map((row) => (
          <div key={row.surface}>
            <div className="type-data text-[20px] font-medium">{USD(row.total)}</div>
            <div className="type-label mt-0.5">
              {row.surface} (today {USD(row.today)})
            </div>
          </div>
        ))}
      </div>

      <h2 className="type-h2 mt-8">Source freshness</h2>
      <DataTable className="mt-3 max-w-3xl">
        <thead>
          <tr>
            <th>Source</th>
            <th>Last run</th>
            <th>Status</th>
            <th>Docs · 14d</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.name}>
              <td className={source.active ? "" : "text-ink-muted"}>
                {source.name}
                {source.active ? "" : " (inactive)"}
              </td>
              <td className="type-data">{staleness(source.lastRunAt)}</td>
              <td
                className={
                  source.lastRunStatus !== null && source.lastRunStatus.startsWith("error")
                    ? "text-distressed"
                    : "text-ink-secondary"
                }
              >
                {source.lastRunStatus ?? "—"}
              </td>
              <td>
                <Sparkline values={source.docsPerDay} />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <h2 className="type-h2 mt-8">Row counts</h2>
      <DataTable className="mt-3 max-w-md">
        <tbody>
          {counts.rowCounts.map((row) => (
            <tr key={row.table}>
              <td>{row.table}</td>
              <td className={numericCell}>{row.rows.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <p className="type-small mt-2 text-ink-muted">
        Estimates from pg_stat (n_live_tup) — exact counts belong to backup-check, not a dashboard
        query.
      </p>
    </div>
  );
}

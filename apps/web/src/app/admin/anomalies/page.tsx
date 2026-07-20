import { anomalies, db, desc } from "@continuum/db";
import { dismissAnomalyAction } from "@/app/admin/actions";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";

export default async function AdminAnomaliesPage() {
  const rows = await db
    .select()
    .from(anomalies)
    .orderBy(desc(anomalies.periodWeek), desc(anomalies.z))
    .limit(200);

  return (
    <div>
      <h1 className="type-h2">Anomalies</h1>
      <p className="mt-2 text-[13px] text-ink-muted">
        Weekly statistical deviations over approved fact series (rolling 12-week baseline, z ≥ 2.5).
        Detection is deterministic; nothing here auto-publishes.
      </p>
      <div className="mt-6">
        {rows.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No anomalies detected.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Week</th>
                <th>Dimension</th>
                <th>Key</th>
                <th className={numericCell}>Observed</th>
                <th className={numericCell}>Baseline</th>
                <th className={numericCell}>z</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="type-data">{String(row.periodWeek)}</td>
                  <td>{row.dimension}</td>
                  <td>{row.dimensionKey}</td>
                  <td className={numericCell}>{row.observed}</td>
                  <td className={numericCell}>
                    {row.baselineMean} ± {row.baselineStd}
                  </td>
                  <td className={`${numericCell} type-data`}>{row.z}</td>
                  <td>
                    <Tag variant={row.status === "new" ? "distressed" : "neutral"}>
                      {row.status ?? ""}
                    </Tag>
                  </td>
                  <td>
                    {row.status === "new" ? (
                      <form action={dismissAnomalyAction}>
                        <input type="hidden" name="anomalyId" value={row.id} />
                        <button
                          type="submit"
                          className="text-[11px] text-ink-muted hover:text-distressed"
                        >
                          dismiss
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </div>
  );
}

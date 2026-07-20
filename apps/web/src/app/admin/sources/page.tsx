import Link from "next/link";
import { asc, db, sources } from "@continuum/db";
import { bulkSetSourcesActiveAction, toggleSourceActiveAction } from "@/app/admin/actions";
import { linkButtonClass } from "@/components/admin/form-styles";
import { DataTable } from "@/components/ui/data-table";
import { RunStatus, formatTimestamp } from "./run-status";

export default async function AdminSourcesPage() {
  const rows = await db.select().from(sources).orderBy(asc(sources.name));

  // Extraction cost visibility at the moment of activation decisions:
  // ceiling = items/day cap × 30 days × ~$0.03 per extracted article.
  // Registry sources bypass paid extraction (deterministic mapper) — excluded.
  const estimate = (list: typeof rows) =>
    list
      .filter((source) => source.sourceType !== "registry")
      .reduce((sum, source) => {
        const config = (source.config ?? {}) as { maxItemsPerRun?: number };
        return sum + (config.maxItemsPerRun ?? 10) * 30 * 0.03;
      }, 0);
  const activeEstimate = estimate(rows.filter((source) => source.active === true));
  const allEstimate = estimate(rows);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="type-h2">Sources</h1>
        <Link href="/admin/sources/new" className={linkButtonClass}>
          New source
        </Link>
      </div>
      <p className="mt-2 text-[13px] tabular-nums text-ink-muted">
        Extraction est./month: ~${activeEstimate.toFixed(0)} with current active sources; ~$
        {allEstimate.toFixed(0)} if every listed source were active (items-cap × 30 days × $0.03
        per article, ceiling — registry sources use the free deterministic mapper).
      </p>
      {(() => {
        // Bulk activation by country × type, with the monthly extraction cost
        // estimate AT the point of decision (same ceiling formula as above).
        const inactive = rows.filter((source) => source.active !== true);
        const groups = new Map<string, typeof rows>();
        for (const source of inactive) {
          const key = `${source.country ?? "—"}|${source.sourceType}`;
          groups.set(key, [...(groups.get(key) ?? []), source]);
        }
        if (groups.size === 0) {
          return null;
        }
        return (
          <div className="mt-6 border border-line p-4">
            <h2 className="type-h3">Bulk activation</h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Inactive sources grouped by country and type. Activating a group starts scheduled
              ingestion for every source in it — the estimate is the monthly extraction ceiling
              you are turning on.
            </p>
            <table className="mt-3 w-full text-[13px]">
              <tbody>
                {[...groups.entries()]
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([key, group]) => {
                    const [country, type] = key.split("|");
                    const cost = estimate(group);
                    return (
                      <tr key={key} className="border-t border-line">
                        <td className="py-1.5">{country}</td>
                        <td>{type}</td>
                        <td className="type-data text-right">{group.length} sources</td>
                        <td className="type-data text-right">
                          {type === "registry" ? "$0 (deterministic)" : `~$${cost.toFixed(0)}/mo`}
                        </td>
                        <td className="text-right">
                          <form action={bulkSetSourcesActiveAction}>
                            <input type="hidden" name="country" value={country === "—" ? "" : country} />
                            <input type="hidden" name="sourceType" value={type} />
                            <input type="hidden" name="activate" value="1" />
                            <button
                              type="submit"
                              className="text-[11px] font-medium uppercase tracking-wide text-accent hover:underline"
                            >
                              Activate all
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        );
      })()}
      <div className="mt-6">
        {rows.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No sources registered.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Type</th>
                <th>Schedule</th>
                <th>Active</th>
                <th>Last run</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((source) => (
                <tr key={source.id}>
                  <td>
                    <Link
                      href={`/admin/sources/${source.id}`}
                      className="text-accent hover:underline"
                    >
                      {source.name}
                    </Link>
                  </td>
                  <td>{source.country ?? ""}</td>
                  <td>{source.sourceType}</td>
                  <td>{source.schedule ?? ""}</td>
                  <td>
                    <form action={toggleSourceActiveAction}>
                      <input type="hidden" name="sourceId" value={source.id} />
                      <button
                        type="submit"
                        className={`text-[11px] font-medium uppercase tracking-wide ${
                          source.active ? "text-equity" : "text-ink-muted"
                        } hover:text-accent`}
                      >
                        {source.active ? "active" : "inactive"}
                      </button>
                    </form>
                  </td>
                  <td className="type-data">{formatTimestamp(source.lastRunAt)}</td>
                  <td>
                    <RunStatus status={source.lastRunStatus} />
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

import Link from "next/link";
import { asc, db, sources } from "@continuum/db";
import { toggleSourceActiveAction } from "@/app/admin/actions";
import { linkButtonClass } from "@/components/admin/form-styles";
import { DataTable } from "@/components/ui/data-table";
import { RunStatus, formatTimestamp } from "./run-status";

export default async function AdminSourcesPage() {
  const rows = await db.select().from(sources).orderBy(asc(sources.name));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="type-h2">Sources</h1>
        <Link href="/admin/sources/new" className={linkButtonClass}>
          New source
        </Link>
      </div>
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

import { notFound } from "next/navigation";
import { db, desc, eq, ingestionRuns, sources, sourceType } from "@continuum/db";
import { DataTable, numericCell } from "@/components/ui/data-table";
import type { ReactNode } from "react";
import { RunStatus, formatTimestamp } from "../run-status";
import { SourceForm } from "../source-form";
import { FetchNow } from "./fetch-now";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="type-label mb-4">{title}</h2>
      {children}
    </section>
  );
}

function compactStats(stats: unknown): string {
  if (stats === null || typeof stats !== "object") {
    return "";
  }
  const record = stats as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.changed === "boolean") {
    parts.push(record.changed ? "changed" : "unchanged");
  }
  if (typeof record.bytes === "number" && record.bytes > 0) {
    parts.push(`${record.bytes.toLocaleString("en-US")} B`);
  }
  if (typeof record.ms === "number") {
    parts.push(`${record.ms.toLocaleString("en-US")} ms`);
  }
  if (typeof record.documentId === "string") {
    parts.push(`doc ${record.documentId.slice(0, 8)}…`);
  }
  return parts.join(" · ");
}

export default async function SourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sourceRows = await db.select().from(sources).where(eq(sources.id, id));
  const source = sourceRows[0];
  if (!source) {
    notFound();
  }
  const runs = await db
    .select()
    .from(ingestionRuns)
    .where(eq(ingestionRuns.sourceId, id))
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(50);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="type-h2">{source.name}</h1>
        <RunStatus status={source.lastRunStatus} />
        <span className="type-data text-ink-muted">{source.url}</span>
      </div>

      <div className="mt-6">
        <Section title="Fetch">
          <FetchNow sourceId={source.id} />
        </Section>

        <Section title="Edit">
          <SourceForm
            mode="edit"
            sourceTypes={[...sourceType.enumValues]}
            sourceId={source.id}
            initial={{
              name: source.name,
              url: source.url ?? "",
              country: source.country ?? "",
              sourceType: source.sourceType,
              schedule: source.schedule ?? "daily",
              active: source.active ?? false,
            }}
          />
        </Section>

        <Section title="Run history">
          {runs.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No runs yet.</p>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Status</th>
                  <th className={numericCell}>Stats</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="type-data">{formatTimestamp(run.startedAt)}</td>
                    <td className="type-data">{formatTimestamp(run.finishedAt)}</td>
                    <td>
                      <RunStatus status={run.status} />
                    </td>
                    <td className={numericCell}>{compactStats(run.stats)}</td>
                    <td className="text-distressed">{run.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Section>
      </div>
    </div>
  );
}

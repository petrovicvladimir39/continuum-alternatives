import Link from "next/link";
import { db, desc, digests, sql } from "@continuum/db";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import { formatTimestamp } from "../sources/run-status";
import { GenerateDigestButton } from "./generate-button";

function statusVariant(status: string | null): "neutral" | "equity" | "distressed" {
  if (status === "draft") {
    return "equity";
  }
  return "neutral";
}

export default async function AdminDigestsPage() {
  const rows = await db
    .select({
      id: digests.id,
      digestDate: digests.digestDate,
      status: digests.status,
      subject: digests.subject,
      sentAt: digests.sentAt,
      itemCount: sql<number>`(SELECT count(*)::int FROM digest_items di WHERE di.digest_id = digests.id AND di.included = true)`,
    })
    .from(digests)
    .orderBy(desc(digests.digestDate));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="type-h2">Digests</h1>
      </div>
      <div className="mt-4">
        <GenerateDigestButton />
      </div>
      <div className="mt-6">
        {rows.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No digests yet.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Status</th>
                <th className={numericCell}>Items</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((digest) => (
                <tr key={digest.id}>
                  <td className="type-data">
                    <Link
                      href={`/admin/digests/${digest.id}`}
                      className="text-accent hover:underline"
                    >
                      {String(digest.digestDate)}
                    </Link>
                  </td>
                  <td>{digest.subject ?? ""}</td>
                  <td>
                    <Tag variant={statusVariant(digest.status)}>{digest.status ?? ""}</Tag>
                  </td>
                  <td className={numericCell}>{digest.itemCount}</td>
                  <td className="type-data">{formatTimestamp(digest.sentAt)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </div>
  );
}

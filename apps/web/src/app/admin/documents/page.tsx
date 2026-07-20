import Link from "next/link";
import { alias, db, desc, documents, sources } from "@continuum/db";
import { eq } from "@continuum/db";
import { DataTable } from "@/components/ui/data-table";
import { formatTimestamp } from "../sources/run-status";
import { ExtractionStatusTag } from "./extraction-status";

export default async function AdminDocumentsPage() {
  const sourceAlias = alias(sources, "doc_source");
  const rows = await db
    .select({
      id: documents.id,
      fetchedAt: documents.fetchedAt,
      docType: documents.docType,
      title: documents.title,
      language: documents.language,
      meta: documents.meta,
      sourceName: sourceAlias.name,
    })
    .from(documents)
    .leftJoin(sourceAlias, eq(documents.sourceId, sourceAlias.id))
    .orderBy(desc(documents.fetchedAt))
    .limit(100);

  return (
    <div>
      <h1 className="type-h2">Documents</h1>
      <p className="mt-2 text-[13px] text-ink-muted">
        Latest 100 stored documents across all sources.
      </p>
      <div className="mt-6">
        {rows.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No documents stored.</p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Fetched</th>
                <th>Source</th>
                <th>Type</th>
                <th>Title</th>
                <th>Lang</th>
                <th>Extraction</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <tr key={doc.id}>
                  <td className="type-data">{formatTimestamp(doc.fetchedAt)}</td>
                  <td>{doc.sourceName ?? ""}</td>
                  <td>{doc.docType ?? ""}</td>
                  <td>
                    <Link
                      href={`/admin/documents/${doc.id}`}
                      className="text-accent hover:underline"
                    >
                      {doc.title ?? "(untitled)"}
                    </Link>
                  </td>
                  <td>{doc.language ?? ""}</td>
                  <td>
                    <ExtractionStatusTag meta={doc.meta} />
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

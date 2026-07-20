import Link from "next/link";
import { notFound } from "next/navigation";
import { db, documents, edges, entities, eq, sources, timelineFacts } from "@continuum/db";
import { DataTable } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import { statusVariant } from "@/components/admin/tag-variant";
import type { ReactNode } from "react";
import { formatTimestamp } from "../../sources/run-status";
import { ExtractionStatusTag } from "../extraction-status";
import { ExtractNow } from "./extract-now";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="type-label mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docRows = await db.select().from(documents).where(eq(documents.id, id));
  const doc = docRows[0];
  if (!doc) {
    notFound();
  }
  const [source, facts, proposedEdges] = await Promise.all([
    doc.sourceId !== null
      ? db.select().from(sources).where(eq(sources.id, doc.sourceId))
      : Promise.resolve([]),
    db
      .select({
        id: timelineFacts.id,
        title: timelineFacts.title,
        status: timelineFacts.status,
        factType: timelineFacts.factType,
        entityId: timelineFacts.entityId,
        entitySlug: entities.slug,
        entityName: entities.name,
      })
      .from(timelineFacts)
      .innerJoin(entities, eq(timelineFacts.entityId, entities.id))
      .where(eq(timelineFacts.sourceDocumentId, id)),
    db
      .select({ id: edges.id, edgeType: edges.edgeType, status: edges.status })
      .from(edges)
      .where(eq(edges.sourceDocumentId, id)),
  ]);

  const meta = (doc.meta ?? {}) as Record<string, unknown>;
  const extraction = meta.extraction as Record<string, unknown> | undefined;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="type-h2">{doc.title ?? "(untitled)"}</h1>
        <Tag>{doc.docType ?? "document"}</Tag>
        <ExtractionStatusTag meta={doc.meta} />
        <span className="type-data text-ink-muted">
          {formatTimestamp(doc.fetchedAt)}
          {doc.language ? ` · ${doc.language}` : ""}
          {source[0] ? ` · ${source[0].name}` : ""}
        </span>
        {/* Phase 27C: prefilled desk starting point — no LLM, the operator writes. */}
        <Link
          href={`/admin/write?fromDoc=${doc.id}`}
          className="text-[13px] text-accent hover:underline"
        >
          Draft article from this →
        </Link>
      </div>
      {doc.url ? (
        <p className="type-data mt-1 text-ink-muted">
          <a href={doc.url} className="text-accent hover:underline">
            {doc.url}
          </a>
        </p>
      ) : null}

      <div className="mt-6">
        <Section title="Extraction">
          <ExtractNow documentId={doc.id} />
          {extraction !== undefined ? (
            <pre className="type-data mt-4 max-w-2xl overflow-x-auto border border-line bg-surface p-3 whitespace-pre-wrap">
              {JSON.stringify(extraction, null, 2)}
            </pre>
          ) : (
            <p className="mt-4 text-[13px] text-ink-muted">Not extracted yet.</p>
          )}
        </Section>

        {facts.length > 0 || proposedEdges.length > 0 ? (
          <Section title="Extracted facts & edges">
            {facts.length > 0 ? (
              <DataTable>
                <thead>
                  <tr>
                    <th>Fact</th>
                    <th>Type</th>
                    <th>Entity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facts.map((fact) => (
                    <tr key={fact.id}>
                      <td>{fact.title}</td>
                      <td>{fact.factType}</td>
                      <td>
                        <Link
                          href={`/admin/entities/${fact.entitySlug}`}
                          className="text-accent hover:underline"
                        >
                          {fact.entityName}
                        </Link>
                      </td>
                      <td>
                        <Tag variant={statusVariant(fact.status)}>{fact.status ?? ""}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : null}
            {proposedEdges.length > 0 ? (
              <p className="mt-3 text-[13px] text-ink-secondary">
                {proposedEdges.length} edge(s) from this document —{" "}
                <Link href="/admin/review" className="text-accent hover:underline">
                  review queue
                </Link>
              </p>
            ) : null}
          </Section>
        ) : null}

        <Section title="Meta">
          <pre className="type-data max-w-2xl overflow-x-auto border border-line bg-surface p-3 whitespace-pre-wrap">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </Section>

        <Section title="Content">
          <pre className="type-data max-h-[480px] max-w-4xl overflow-auto border border-line bg-surface p-3 whitespace-pre-wrap">
            {doc.contentText ?? "(no content)"}
          </pre>
        </Section>
      </div>
    </div>
  );
}

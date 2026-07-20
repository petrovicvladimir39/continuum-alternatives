import Link from "next/link";
import { CHANNELS } from "@continuum/shared";
import { alias, db, edges, entities, eq, ne, timelineFacts } from "@continuum/db";
import {
  approveEdgeAction,
  approveFactAction,
  deleteProvisionalAction,
  rejectEdgeAction,
  rejectFactAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6 first:border-t-0">
      <h2 className="type-label mb-4">{title}</h2>
      {children}
    </section>
  );
}

type FactData = {
  entities?: string[];
  excerpt_original?: string;
  title_original?: string;
  language?: string;
  resolution?: { name: string; candidates: { slug: string; score: number }[] }[];
};

export default async function ReviewPage() {
  const sourceEntity = alias(entities, "source_entity");
  const targetEntity = alias(entities, "target_entity");

  const [proposedEdges, proposedFacts, provisionals, factRefs, edgeRefs] = await Promise.all([
    db
      .select({
        id: edges.id,
        edgeType: edges.edgeType,
        confidence: edges.confidence,
        startedOn: edges.startedOn,
        role: edges.role,
        sourceDocumentId: edges.sourceDocumentId,
        sourceName: sourceEntity.name,
        sourceSlug: sourceEntity.slug,
        targetName: targetEntity.name,
        targetSlug: targetEntity.slug,
      })
      .from(edges)
      .innerJoin(sourceEntity, eq(edges.sourceEntityId, sourceEntity.id))
      .innerJoin(targetEntity, eq(edges.targetEntityId, targetEntity.id))
      .where(eq(edges.status, "proposed")),
    db
      .select({
        id: timelineFacts.id,
        title: timelineFacts.title,
        body: timelineFacts.body,
        factType: timelineFacts.factType,
        occurredOn: timelineFacts.occurredOn,
        audienceChannels: timelineFacts.audienceChannels,
        confidence: timelineFacts.confidence,
        data: timelineFacts.data,
        sourceDocumentId: timelineFacts.sourceDocumentId,
        entityName: entities.name,
        entitySlug: entities.slug,
      })
      .from(timelineFacts)
      .innerJoin(entities, eq(timelineFacts.entityId, entities.id))
      .where(eq(timelineFacts.status, "proposed")),
    db.select().from(entities).where(eq(entities.status, "provisional")),
    db
      .select({ entityId: timelineFacts.entityId, data: timelineFacts.data })
      .from(timelineFacts)
      .where(ne(timelineFacts.status, "rejected")),
    db
      .select({
        source: edges.sourceEntityId,
        target: edges.targetEntityId,
        deal: edges.dealEntityId,
      })
      .from(edges)
      .where(ne(edges.status, "rejected")),
  ]);

  const referenced = new Set<string>();
  for (const ref of factRefs) {
    referenced.add(ref.entityId);
    const data = (ref.data ?? {}) as FactData;
    for (const id of data.entities ?? []) {
      referenced.add(String(id));
    }
  }
  for (const ref of edgeRefs) {
    referenced.add(ref.source);
    referenced.add(ref.target);
    if (ref.deal !== null) {
      referenced.add(ref.deal);
    }
  }
  const orphanedProvisionals = provisionals.filter((entity) => !referenced.has(entity.id));

  const empty = proposedEdges.length === 0 && proposedFacts.length === 0;

  return (
    <div>
      <h1 className="type-h2">Review</h1>
      <p className="mt-2 text-[13px] text-ink-muted">
        Proposed items awaiting a decision. Nothing publishes without approval; approving promotes
        any provisional entities the item references.
      </p>
      {empty ? (
        <p className="mt-6 text-[13px] text-ink-secondary">Nothing awaiting review.</p>
      ) : null}

      <div className="mt-6">
        {proposedFacts.length > 0 ? (
          <Section title="Proposed timeline facts">
            <div className="space-y-4">
              {proposedFacts.map((fact) => {
                const data = (fact.data ?? {}) as FactData;
                return (
                  <div key={fact.id} className="border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="type-h3">{fact.title}</span>
                      <Tag>{fact.factType}</Tag>
                      <span className="type-data text-ink-muted">
                        {fact.occurredOn} · conf {fact.confidence}
                        {data.language ? ` · ${data.language}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-ink-secondary">
                      <Link
                        href={`/admin/entities/${fact.entitySlug}`}
                        className="text-accent hover:underline"
                      >
                        {fact.entityName}
                      </Link>
                      {fact.body ? ` — ${fact.body}` : ""}
                    </p>
                    {data.excerpt_original !== undefined ? (
                      <blockquote className="type-small mt-3 border-l-2 border-line-strong pl-3 text-ink-secondary">
                        {data.title_original !== undefined ? (
                          <span className="mb-1 block font-medium">{data.title_original}</span>
                        ) : null}
                        “{data.excerpt_original}”
                      </blockquote>
                    ) : null}
                    {data.resolution !== undefined && data.resolution.length > 0 ? (
                      <div className="mt-3 border border-line-strong p-3">
                        <p className="type-label mb-2">Ambiguous resolution</p>
                        {data.resolution.map((entry) => (
                          <p key={entry.name} className="text-[13px]">
                            “{entry.name}” — candidates:{" "}
                            {entry.candidates.map((candidate, i) => (
                              <span key={candidate.slug}>
                                {i > 0 ? ", " : ""}
                                <Link
                                  href={`/admin/entities/${candidate.slug}`}
                                  className="text-accent hover:underline"
                                >
                                  {candidate.slug}
                                </Link>{" "}
                                <span className="type-data text-ink-muted">
                                  ({candidate.score.toFixed(3)})
                                </span>
                              </span>
                            ))}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                      {/* Channel edits on proposed rows are legitimate — immutability
                          begins at approval. */}
                      <form action={approveFactAction} className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="factId" value={fact.id} />
                        <div>
                          <span className="type-label mb-1 block">Channels</span>
                          <div className="flex flex-wrap gap-3 text-[13px]">
                            {CHANNELS.map((channel) => (
                              <label key={channel} className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  name="channels"
                                  value={channel}
                                  defaultChecked={fact.audienceChannels.includes(channel)}
                                />
                                {channel}
                              </label>
                            ))}
                          </div>
                        </div>
                        <Button type="submit">Approve</Button>
                      </form>
                      <div className="flex items-center gap-3">
                        {fact.sourceDocumentId !== null ? (
                          <Link
                            href={`/admin/documents/${fact.sourceDocumentId}`}
                            className="text-[13px] text-accent hover:underline"
                          >
                            source document
                          </Link>
                        ) : null}
                        <form action={rejectFactAction}>
                          <input type="hidden" name="factId" value={fact.id} />
                          <Button type="submit" variant="ghost">
                            Reject
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        {proposedEdges.length > 0 ? (
          <Section title="Proposed edges">
            <DataTable>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Role</th>
                  <th className={numericCell}>Conf.</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {proposedEdges.map((edge) => (
                  <tr key={edge.id}>
                    <td>
                      <Link
                        href={`/admin/entities/${edge.sourceSlug}`}
                        className="text-accent hover:underline"
                      >
                        {edge.sourceName}
                      </Link>
                    </td>
                    <td>{edge.edgeType}</td>
                    <td>
                      <Link
                        href={`/admin/entities/${edge.targetSlug}`}
                        className="text-accent hover:underline"
                      >
                        {edge.targetName}
                      </Link>
                    </td>
                    <td>{edge.role ?? ""}</td>
                    <td className={numericCell}>{edge.confidence}</td>
                    <td className="type-data">{edge.startedOn ?? ""}</td>
                    <td>
                      <span className="flex items-center justify-end gap-2">
                        {edge.sourceDocumentId !== null ? (
                          <Link
                            href={`/admin/documents/${edge.sourceDocumentId}`}
                            className="text-[11px] text-accent hover:underline"
                          >
                            doc
                          </Link>
                        ) : null}
                        <form action={approveEdgeAction}>
                          <input type="hidden" name="edgeId" value={edge.id} />
                          <Button type="submit">Approve</Button>
                        </form>
                        <form action={rejectEdgeAction}>
                          <input type="hidden" name="edgeId" value={edge.id} />
                          <Button type="submit" variant="ghost">
                            Reject
                          </Button>
                        </form>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </Section>
        ) : null}

        {orphanedProvisionals.length > 0 ? (
          <Section title="Provisional entities (orphaned)">
            <p className="mb-3 text-[13px] text-ink-muted">
              Provisional entities no approved or pending item references.
            </p>
            <ul className="space-y-2">
              {orphanedProvisionals.map((entity) => (
                <li key={entity.id} className="flex items-center gap-3 text-[13px]">
                  <Link
                    href={`/admin/entities/${entity.slug}`}
                    className="text-accent hover:underline"
                  >
                    {entity.name}
                  </Link>
                  <span className="type-data text-ink-muted">
                    {entity.kind}
                    {entity.country ? ` · ${entity.country}` : ""}
                  </span>
                  <form action={deleteProvisionalAction}>
                    <input type="hidden" name="entityId" value={entity.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-ink-muted hover:text-distressed"
                    >
                      delete
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

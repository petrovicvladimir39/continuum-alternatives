import Link from "next/link";
import { alias, db, edges, entities, eq, timelineFacts } from "@continuum/db";
import {
  approveEdgeAction,
  approveFactAction,
  rejectEdgeAction,
  rejectFactAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { DataTable, numericCell } from "@/components/ui/data-table";
import type { ReactNode } from "react";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6 first:border-t-0">
      <h2 className="type-label mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default async function ReviewPage() {
  const sourceEntity = alias(entities, "source_entity");
  const targetEntity = alias(entities, "target_entity");

  const [proposedEdges, proposedFacts] = await Promise.all([
    db
      .select({
        id: edges.id,
        edgeType: edges.edgeType,
        confidence: edges.confidence,
        startedOn: edges.startedOn,
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
        occurredOn: timelineFacts.occurredOn,
        audienceChannels: timelineFacts.audienceChannels,
        confidence: timelineFacts.confidence,
        entityName: entities.name,
        entitySlug: entities.slug,
      })
      .from(timelineFacts)
      .innerJoin(entities, eq(timelineFacts.entityId, entities.id))
      .where(eq(timelineFacts.status, "proposed")),
  ]);

  const empty = proposedEdges.length === 0 && proposedFacts.length === 0;

  return (
    <div>
      <h1 className="type-h2">Review</h1>
      <p className="mt-2 text-[13px] text-ink-muted">
        Proposed items awaiting a decision. This queue is fed by the extraction pipeline (Phase 10);
        today it only shows manually created proposed items.
      </p>
      {empty ? (
        <p className="mt-6 text-[13px] text-ink-secondary">Nothing awaiting review.</p>
      ) : null}

      <div className="mt-6">
        {proposedEdges.length > 0 ? (
          <Section title="Proposed edges">
            <DataTable>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Target</th>
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
                    <td className={numericCell}>{edge.confidence}</td>
                    <td className="type-data">{edge.startedOn ?? ""}</td>
                    <td>
                      <span className="flex justify-end gap-2">
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

        {proposedFacts.length > 0 ? (
          <Section title="Proposed timeline facts">
            <DataTable>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Channels</th>
                  <th className={numericCell}>Conf.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {proposedFacts.map((fact) => (
                  <tr key={fact.id}>
                    <td>
                      <Link
                        href={`/admin/entities/${fact.entitySlug}`}
                        className="text-accent hover:underline"
                      >
                        {fact.entityName}
                      </Link>
                    </td>
                    <td>{fact.title}</td>
                    <td className="type-data">{fact.occurredOn}</td>
                    <td>{fact.audienceChannels.join(", ")}</td>
                    <td className={numericCell}>{fact.confidence}</td>
                    <td>
                      <span className="flex justify-end gap-2">
                        <form action={approveFactAction}>
                          <input type="hidden" name="factId" value={fact.id} />
                          <Button type="submit">Approve</Button>
                        </form>
                        <form action={rejectFactAction}>
                          <input type="hidden" name="factId" value={fact.id} />
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
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { CHANNELS } from "@continuum/shared";
import {
  aliases as aliasesTable,
  db,
  edgeType,
  eq,
  getBySlug,
  getTimeline,
  listEdges,
} from "@continuum/db";
import { addAliasAction, deleteEdgeAction } from "@/app/admin/actions";
import { inputClass, labelClass } from "@/components/admin/form-styles";
import { statusVariant } from "@/components/admin/tag-variant";
import { Button } from "@/components/ui/button";
import { DataTable, numericCell } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import type { ReactNode } from "react";
import { DETAIL_FIELDS } from "../detail-fields";
import { EdgeForm } from "./edge-form";
import { EntityEditForm } from "./edit-form";
import { FactForm } from "./fact-form";
import { TagEditor } from "./tag-editor";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <h2 className="type-label mb-4">{title}</h2>
      {children}
    </section>
  );
}

function toInputString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 16);
  }
  return String(value);
}

export default async function EntityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getBySlug(slug);
  if (!found) {
    notFound();
  }
  const { entity, detail, tags } = found;
  const [entityEdges, timeline, aliasRows] = await Promise.all([
    listEdges(slug, "both"),
    getTimeline(slug),
    db.select().from(aliasesTable).where(eq(aliasesTable.entityId, entity.id)),
  ]);

  const detailFields = DETAIL_FIELDS[entity.kind];
  const detailInitial: Record<string, string> = {};
  for (const field of detailFields) {
    if (field.key === "managerSlug") {
      continue;
    }
    detailInitial[field.key] = toInputString(detail?.[field.key]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="type-h2">{entity.name}</h1>
        <Tag>{entity.kind}</Tag>
        {entity.country ? <span className="text-[13px]">{entity.country}</span> : null}
        <span className="type-data text-ink-muted">{entity.slug}</span>
      </div>
      {entity.summary ? (
        <p className="mt-2 max-w-2xl text-ink-secondary">{entity.summary}</p>
      ) : null}

      <div className="mt-6 space-y-0">
        <Section title="Tags">
          <TagEditor slug={slug} tags={tags} />
        </Section>

        <Section title="Aliases">
          {aliasRows.length === 0 ? (
            <p className="mb-3 text-[13px] text-ink-muted">No aliases.</p>
          ) : (
            <ul className="mb-3 space-y-1 text-[13px]">
              {aliasRows.map((alias) => (
                <li key={alias.id}>
                  {alias.alias}{" "}
                  <span className="type-data text-ink-muted">
                    ({alias.aliasNormalized}
                    {alias.lang ? ` · ${alias.lang}` : ""})
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={addAliasAction} className="flex max-w-md items-end gap-2">
            <input type="hidden" name="slug" value={slug} />
            <div className="flex-1">
              <label className={labelClass} htmlFor="alias">
                Add alias
              </label>
              <input id="alias" name="alias" required className={inputClass} />
            </div>
            <div className="w-16">
              <label className={labelClass} htmlFor="alias-lang">
                Lang
              </label>
              <input id="alias-lang" name="lang" maxLength={2} className={inputClass} />
            </div>
            <Button type="submit" variant="ghost">
              Add
            </Button>
          </form>
        </Section>

        <Section title="Edit">
          <EntityEditForm
            slug={slug}
            initial={{
              name: entity.name,
              country: entity.country ?? "",
              summary: entity.summary ?? "",
            }}
            detailFields={detailFields.map((field) => ({ ...field }))}
            detailInitial={detailInitial}
          />
        </Section>

        <Section title="Edges">
          {entityEdges.length === 0 ? (
            <p className="mb-4 text-[13px] text-ink-muted">No edges.</p>
          ) : (
            <div className="mb-6">
              <DataTable>
                <thead>
                  <tr>
                    <th>Dir</th>
                    <th>Type</th>
                    <th>Counterpart</th>
                    <th>Role</th>
                    <th>Date</th>
                    <th className={numericCell}>Amount</th>
                    <th className={numericCell}>Conf.</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {entityEdges.map((edge) => {
                    const outgoing = edge.sourceSlug === slug;
                    const counterpartSlug = outgoing ? edge.targetSlug : edge.sourceSlug;
                    const counterpartName = outgoing ? edge.targetName : edge.sourceName;
                    return (
                      <tr key={edge.id}>
                        <td className="type-data">{outgoing ? "→" : "←"}</td>
                        <td>{edge.edgeType}</td>
                        <td>
                          <Link
                            href={`/admin/entities/${counterpartSlug}`}
                            className="text-accent hover:underline"
                          >
                            {counterpartName}
                          </Link>
                        </td>
                        <td>{edge.role ?? ""}</td>
                        <td className="type-data">{edge.startedOn ?? ""}</td>
                        <td className={numericCell}>
                          {edge.amount
                            ? `${edge.amount}${edge.currency ? ` ${edge.currency}` : ""}`
                            : ""}
                        </td>
                        <td className={numericCell}>{edge.confidence}</td>
                        <td>
                          <Tag variant={statusVariant(edge.status)}>{edge.status}</Tag>
                        </td>
                        <td>
                          {edge.status === "proposed" ? (
                            <form action={deleteEdgeAction}>
                              <input type="hidden" name="slug" value={slug} />
                              <input type="hidden" name="edgeId" value={edge.id} />
                              <button
                                type="submit"
                                className="text-[11px] text-ink-muted hover:text-distressed"
                              >
                                delete
                              </button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            </div>
          )}
          <h3 className="type-h3 mb-3">Add edge</h3>
          <EdgeForm slug={slug} edgeTypes={[...edgeType.enumValues]} />
        </Section>

        <Section title="Timeline">
          <p className="mb-3 text-[13px] text-ink-muted">
            Timeline facts are append-only; corrections are recorded as new facts.
          </p>
          {timeline.length === 0 ? (
            <p className="mb-4 text-[13px] text-ink-muted">No facts recorded.</p>
          ) : (
            <div className="mb-6">
              <DataTable>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Channels</th>
                    <th className={numericCell}>Conf.</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((fact) => (
                    <tr key={fact.id}>
                      <td className="type-data">{fact.occurredOn}</td>
                      <td>{fact.title}</td>
                      <td>{fact.factType}</td>
                      <td>
                        <span className="flex flex-wrap gap-1">
                          {fact.audienceChannels.map((channel) => (
                            <Tag key={channel}>{channel}</Tag>
                          ))}
                        </span>
                      </td>
                      <td className={numericCell}>{fact.confidence}</td>
                      <td>
                        <Tag variant={statusVariant(fact.status)}>{fact.status ?? ""}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
          <h3 className="type-h3 mb-3">Add fact</h3>
          <FactForm slug={slug} channels={[...CHANNELS]} />
        </Section>
      </div>
    </div>
  );
}

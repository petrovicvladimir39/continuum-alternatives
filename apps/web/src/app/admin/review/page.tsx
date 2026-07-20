import Link from "next/link";
import { CHANNELS, classifiedLabel } from "@continuum/shared";
import {
  alias,
  db,
  documents,
  edges,
  entities,
  eq,
  listArticlesByStatus,
  listProposedClassifications,
  listProposedStories,
  listProvisionalEvents,
  ne,
  organizations,
  sources,
  sql,
  timelineFacts,
} from "@continuum/db";
import {
  approveAllVisibleAction,
  approveEdgeAction,
  approveEventAction,
  classificationGroupAction,
  approveEnrichmentAction,
  approveFactAction,
  deleteProvisionalAction,
  rejectEdgeAction,
  rejectEnrichmentAction,
  rejectEventAction,
  rejectFactAction,
} from "@/app/admin/actions";
import { decideStoryAction } from "@/app/admin/claims/actions";
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

const FILTERS = ["all", "facts", "edges", "articles", "classifications", "events", "stories", ...CHANNELS] as const;

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(rawFilter ?? "") ? rawFilter! : "all";
  const channelFilter = (CHANNELS as readonly string[]).includes(filter) ? filter : null;
  const showFacts = filter === "all" || filter === "facts" || channelFilter !== null;
  const showEdges = filter === "all" || filter === "edges";
  const showArticles = filter === "all" || filter === "articles";
  const proposedArticles = showArticles ? await listArticlesByStatus("proposed") : [];
  const showClassifications = filter === "all" || filter === "classifications";
  const proposedClassifications = showClassifications ? await listProposedClassifications() : [];
  // Phase 31A: imported events (CSV/harvest) awaiting the operator's thumb.
  const showEvents = filter === "all" || filter === "events";
  const proposedEvents = showEvents ? await listProvisionalEvents() : [];
  // Phase 33B: vendor stories — the operator gate atop the client-consent gate.
  const proposedStories = filter === "all" || filter === "stories" ? await listProposedStories() : [];
  // Grouped by (class, strategy) for batch decisions (Phase 26B).
  const classificationGroups = new Map<string, typeof proposedClassifications>();
  for (const row of proposedClassifications) {
    const key = `${row.assetClass}|${row.strategy}`;
    classificationGroups.set(key, [...(classificationGroups.get(key) ?? []), row]);
  }

  const sourceEntity = alias(entities, "source_entity");
  const targetEntity = alias(entities, "target_entity");
  const factSource = alias(sources, "fact_source");
  const edgeSource = alias(sources, "edge_source");
  const factDoc = alias(documents, "fact_doc");
  const edgeDoc = alias(documents, "edge_doc");

  // One grouped enrichment item per org with pending proposed fields.
  const enrichmentRows = await db
    .select({
      entityId: organizations.entityId,
      enrichment: organizations.enrichment,
      name: entities.name,
      slug: entities.slug,
    })
    .from(organizations)
    .innerJoin(entities, eq(entities.id, organizations.entityId))
    .where(sql`${organizations.enrichment}->'proposed' is not null
      and ${organizations.enrichment}->'proposed' != '{}'::jsonb`);

  const [allEdges, allFacts, provisionals, factRefs, edgeRefs] = await Promise.all([
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
        docSourceName: edgeSource.name,
      })
      .from(edges)
      .innerJoin(sourceEntity, eq(edges.sourceEntityId, sourceEntity.id))
      .innerJoin(targetEntity, eq(edges.targetEntityId, targetEntity.id))
      .leftJoin(edgeDoc, eq(edges.sourceDocumentId, edgeDoc.id))
      .leftJoin(edgeSource, eq(edgeDoc.sourceId, edgeSource.id))
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
        docSourceName: factSource.name,
      })
      .from(timelineFacts)
      .innerJoin(entities, eq(timelineFacts.entityId, entities.id))
      .leftJoin(factDoc, eq(timelineFacts.sourceDocumentId, factDoc.id))
      .leftJoin(factSource, eq(factDoc.sourceId, factSource.id))
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

  const proposedFacts = showFacts
    ? allFacts.filter(
        (fact) => channelFilter === null || fact.audienceChannels.includes(channelFilter),
      )
    : [];
  const proposedEdges = showEdges ? allEdges : [];

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

  const visibleCount = proposedFacts.length + proposedEdges.length;

  return (
    <div>
      <h1 className="type-h2">Review</h1>
      <p className="mt-2 text-[13px] text-ink-muted">
        Proposed items awaiting a decision. Nothing publishes without approval; approving promotes
        any provisional entities the item references.
      </p>

      <div className="mt-4 flex flex-wrap gap-1 border-b border-line pb-2">
        {FILTERS.map((value) => (
          <Link
            key={value}
            href={value === "all" ? "/admin/review" : `/admin/review?filter=${value}`}
            className={`px-2 py-1 text-[13px] ${
              filter === value ? "font-medium text-accent" : "text-ink-secondary hover:text-accent"
            }`}
          >
            {value}
          </Link>
        ))}
      </div>

      {visibleCount === 0 ? (
        <p className="mt-6 text-[13px] text-ink-secondary">Nothing awaiting review.</p>
      ) : (
        <form action={approveAllVisibleAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="hidden"
            name="factIds"
            value={proposedFacts.map((fact) => fact.id).join(",")}
          />
          <input
            type="hidden"
            name="edgeIds"
            value={proposedEdges.map((edge) => edge.id).join(",")}
          />
          <label className="flex items-center gap-1.5 text-[13px]">
            <input type="checkbox" name="confirm" required />
            Confirm batch approval (stored channels apply as-is)
          </label>
          <Button type="submit" variant="ghost">
            Approve all visible ({Math.min(visibleCount, 20)})
          </Button>
        </form>
      )}

      <div className="mt-6">
        {classificationGroups.size > 0 ? (
          <Section title="Proposed classifications (keyword pass)">
            <p className="mb-3 text-[13px] text-ink-muted">
              Keyword inferences never auto-approve. Approve or reject per strategy group;
              individual outliers can be corrected later on the entity page.
            </p>
            <div className="space-y-4">
              {[...classificationGroups.entries()].map(([key, group]) => {
                const [assetClass, strategy] = key.split("|");
                return (
                  <div key={key} className="border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="type-h3">
                        {classifiedLabel(assetClass ?? "", strategy ?? "")}
                        <span className="type-data ml-2 text-ink-muted">{group.length} proposed</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <form action={classificationGroupAction}>
                          <input type="hidden" name="assetClass" value={assetClass} />
                          <input type="hidden" name="strategy" value={strategy} />
                          <input type="hidden" name="decision" value="approved" />
                          <Button type="submit">Approve all</Button>
                        </form>
                        <form action={classificationGroupAction}>
                          <input type="hidden" name="assetClass" value={assetClass} />
                          <input type="hidden" name="strategy" value={strategy} />
                          <input type="hidden" name="decision" value="rejected" />
                          <Button type="submit" variant="ghost">
                            Reject all
                          </Button>
                        </form>
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] leading-[1.6] text-ink-secondary">
                      {group.slice(0, 12).map((row, index) => (
                        <span key={row.entityId + row.strategy}>
                          {index > 0 ? ", " : ""}
                          <Link
                            href={`/admin/entities/${row.entitySlug}`}
                            className="text-accent hover:underline"
                          >
                            {row.entityName}
                          </Link>
                        </span>
                      ))}
                      {group.length > 12 ? ` … +${group.length - 12} more` : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}

        {proposedEvents.length > 0 ? (
          <Section title="Proposed events (import/harvest)">
            <p className="mb-3 text-[13px] text-ink-muted">
              Imported from the operator CSV or the SmithNovak/TMA harvesters. Approve → live on
              /events + the iCal feed; reject deletes the proposal (it never published).
            </p>
            <div className="space-y-2">
              {proposedEvents.map((event) => (
                <div key={event.entityId} className="flex flex-wrap items-baseline gap-3 border border-line p-2.5">
                  <span className="type-data w-[170px] shrink-0">
                    {event.startsOn}
                    {event.endsOn !== event.startsOn ? ` → ${event.endsOn}` : ""}
                    {event.expected ? " (expected)" : ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium">{event.name}</span>
                    <span className="type-small text-ink-muted">
                      {" "}
                      · {[event.city, event.country, event.format.replace("_", " ")].filter(Boolean).join(" · ")}
                      {event.classes.length > 0 ? ` · ${event.classes.join(", ")}` : ""}
                      {event.url !== null ? (
                        <>
                          {" · "}
                          <a href={event.url} rel="noopener noreferrer" className="text-accent hover:underline">
                            official ↗
                          </a>
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <form action={approveEventAction}>
                      <input type="hidden" name="entityId" value={event.entityId} />
                      <Button type="submit" variant="ghost">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectEventAction}>
                      <input type="hidden" name="entityId" value={event.entityId} />
                      <button type="submit" className="text-[12px] text-ink-muted hover:text-distressed">
                        Reject
                      </button>
                    </form>
                  </span>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {proposedStories.length > 0 ? (
          <Section title="Proposed vendor stories">
            <p className="mb-3 text-[13px] text-ink-muted">
              Steward-written track-record stories. The client-consent gate already ran: a named
              client here means their steward GRANTED it; &ldquo;anonymized&rdquo; renders a
              generic descriptor. Publishing is the second gate.
            </p>
            <div className="space-y-3">
              {proposedStories.map((story) => (
                <div key={story.id} className="border border-line p-3">
                  <p className="text-[13px]">
                    <span className="font-medium">{story.title}</span>
                    <span className="type-small text-ink-muted">
                      {" "}
                      · {story.vendorName} · client:{" "}
                      {story.clientDisplay ?? "(none)"} · consent: {story.clientConsent}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap border-l-2 border-line pl-2 text-[13px] text-ink-secondary">
                    {story.bodyMd.slice(0, 400)}
                  </p>
                  <div className="mt-2 flex gap-3">
                    <form action={decideStoryAction}>
                      <input type="hidden" name="storyId" value={story.id} />
                      <input type="hidden" name="decision" value="publish" />
                      <Button type="submit" variant="ghost">
                        Publish
                      </Button>
                    </form>
                    <form action={decideStoryAction}>
                      <input type="hidden" name="storyId" value={story.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button type="submit" className="text-[12px] text-ink-muted hover:text-distressed">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {proposedArticles.length > 0 ? (
          <Section title="Proposed articles (News Desk)">
            <p className="mb-3 text-[13px] text-ink-muted">
              Composed from approved facts only, mechanically guarded. Open to edit and decide —
              nothing auto-publishes.
            </p>
            <div className="space-y-3">
              {proposedArticles.map((article) => (
                <div key={article.id} className="border border-line bg-surface p-4">
                  <Link
                    href={`/admin/review/article/${article.id}`}
                    className="font-serif text-[19px] font-medium leading-snug text-ink hover:text-accent"
                  >
                    {article.headline}
                  </Link>
                  {article.deck !== null ? (
                    <p className="mt-1 text-[13px] text-ink-secondary">{article.deck}</p>
                  ) : null}
                  <p className="type-data mt-1.5 text-ink-muted">
                    {article.entityName ?? "—"} · {article.channels.join(", ") || "no channels"} ·{" "}
                    <Link
                      href={`/admin/review/article/${article.id}`}
                      className="text-accent hover:underline"
                    >
                      review →
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

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
                        {fact.docSourceName ? ` · ${fact.docSourceName}` : ""}
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
                  <th>From</th>
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
                    <td>{edge.docSourceName ?? ""}</td>
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

        {filter === "all" && enrichmentRows.length > 0 ? (
          <Section title="Enrichment proposals">
            <p className="mb-3 text-[13px] text-ink-muted">
              Guarded factual fields extracted from company websites. Approving writes them to the
              org detail; the overview itself is already published (labeled, sourced).
            </p>
            <div className="space-y-4">
              {enrichmentRows.map((row) => {
                const enrichment = (row.enrichment ?? {}) as {
                  proposed?: Record<string, string | number>;
                  source_urls?: string[];
                };
                const proposed = enrichment.proposed ?? {};
                return (
                  <div key={row.entityId} className="border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="type-h3">Enrichment: {row.name}</span>
                      <Link
                        href={`/admin/entities/${row.slug}`}
                        className="text-[13px] text-accent hover:underline"
                      >
                        entity
                      </Link>
                    </div>
                    <dl className="mt-2 space-y-1">
                      {Object.entries(proposed).map(([field, value]) => (
                        <div key={field} className="flex gap-3 text-[13px]">
                          <dt className="type-label w-[120px] shrink-0 pt-0.5">
                            {field.replaceAll("_", " ")}
                          </dt>
                          <dd className="tabular-nums">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    {(enrichment.source_urls ?? []).length > 0 ? (
                      <p className="type-small mt-2 text-ink-muted">
                        Sources:{" "}
                        {(enrichment.source_urls ?? []).map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            {i > 0 ? ", " : ""}
                            {url.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        ))}
                      </p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      <form action={approveEnrichmentAction}>
                        <input type="hidden" name="entityId" value={row.entityId} />
                        <Button type="submit">Approve fields</Button>
                      </form>
                      <form action={rejectEnrichmentAction}>
                        <input type="hidden" name="entityId" value={row.entityId} />
                        <Button type="submit" variant="ghost">
                          Reject
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
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

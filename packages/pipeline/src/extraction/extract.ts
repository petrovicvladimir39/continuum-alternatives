import {
  createEntity,
  db,
  documents,
  edges,
  entities,
  eq,
  resolveEntity,
  timelineFacts,
  type EntityKind,
} from "@continuum/db";
import { callExtraction, type ExtractionUsage } from "./client";
import { applyGuards, type GuardStats } from "./guards";
import { CONTENT_CAP } from "./prompt";
import type { ExtractedItem } from "./schema";

export type ResolvedEntityInfo = {
  name: string;
  entityId: string;
  outcome: "matched" | "provisional" | "ambiguous-provisional";
  slug: string;
  candidates?: { slug: string; score: number }[];
};

export type ExtractDocumentResult = {
  status: "done" | "irrelevant" | "skipped" | "error";
  items: number;
  factsStored: number;
  edgesStored: number;
  entitiesMatched: number;
  entitiesProvisional: number;
  entitiesAmbiguous: number;
  guardStats?: GuardStats;
  usage?: ExtractionUsage;
  relevant?: boolean;
  language?: string;
  message?: string;
};

async function resolveOrCreate(item: ExtractedItem): Promise<Map<string, ResolvedEntityInfo>> {
  const map = new Map<string, ResolvedEntityInfo>();
  for (const extracted of item.entities) {
    if (map.has(extracted.name)) {
      continue;
    }
    const resolution = await resolveEntity({
      name: extracted.name,
      kindHint: extracted.kindHint as EntityKind,
      ...(extracted.country !== undefined ? { country: extracted.country.toUpperCase() } : {}),
      ...(extracted.registryId !== undefined ? { registryId: extracted.registryId } : {}),
    });
    if (resolution.outcome === "matched" && resolution.entityId !== undefined) {
      const slug = resolution.candidates[0]?.slug ?? "";
      map.set(extracted.name, {
        name: extracted.name,
        entityId: resolution.entityId,
        outcome: "matched",
        slug,
      });
      continue;
    }
    // new or ambiguous → create as PROVISIONAL; ambiguity is stamped on the
    // proposed fact for the reviewer (never auto-merged).
    const created = await createEntity({
      kind: extracted.kindHint as EntityKind,
      name: extracted.name,
      ...(extracted.country !== undefined ? { country: extracted.country.toUpperCase() } : {}),
    });
    await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, created.id));
    map.set(extracted.name, {
      name: extracted.name,
      entityId: created.id,
      outcome: resolution.outcome === "ambiguous" ? "ambiguous-provisional" : "provisional",
      slug: created.slug,
      ...(resolution.outcome === "ambiguous"
        ? {
            candidates: resolution.candidates.map(({ slug, score }) => ({ slug, score })),
          }
        : {}),
    });
  }
  return map;
}

/**
 * Full extraction pass over one stored document: LLM call → mechanical guards →
 * entity resolution (provisional creation) → proposed facts + edges. Everything
 * lands status='proposed'; nothing publishes without human approval.
 */
export async function extractDocument(
  documentId: string,
  options: { force?: boolean } = {},
): Promise<ExtractDocumentResult> {
  const docRows = await db.select().from(documents).where(eq(documents.id, documentId));
  const doc = docRows[0];
  if (!doc) {
    throw new Error(`Unknown document id: ${documentId}`);
  }
  const meta = (doc.meta ?? {}) as Record<string, unknown>;
  const previous = meta.extraction as Record<string, unknown> | undefined;
  if (previous?.status === "done" && options.force !== true) {
    return {
      status: "skipped",
      items: 0,
      factsStored: 0,
      edgesStored: 0,
      entitiesMatched: 0,
      entitiesProvisional: 0,
      entitiesAmbiguous: 0,
      message: "already extracted (use force to re-run)",
    };
  }
  if (!doc.contentText || doc.contentText.trim() === "") {
    throw new Error(`Document ${documentId} has no content_text`);
  }

  const cappedText = doc.contentText.slice(0, CONTENT_CAP);
  const debtorHint = typeof meta.debtorName === "string" ? meta.debtorName : undefined;

  const stamp = async (extraction: Record<string, unknown>) => {
    await db
      .update(documents)
      .set({ meta: { ...meta, extraction } })
      .where(eq(documents.id, documentId));
  };

  try {
    const { result, usage } = await callExtraction({
      documentId,
      title: doc.title,
      contentText: doc.contentText,
      ...(debtorHint !== undefined ? { knownEntityHint: debtorHint } : {}),
    });

    if (!result.relevant) {
      await stamp({
        status: "irrelevant",
        at: new Date().toISOString(),
        model: "claude-sonnet-4-6",
        items: 0,
      });
      return {
        status: "irrelevant",
        items: 0,
        factsStored: 0,
        edgesStored: 0,
        entitiesMatched: 0,
        entitiesProvisional: 0,
        entitiesAmbiguous: 0,
        usage,
        relevant: false,
        language: result.language,
      };
    }

    // The guard corpus must cover everything the model was shown: the title
    // and the registry debtor hint are legitimate sources of entity names.
    const guardCorpus = [doc.title ?? "", debtorHint ?? "", cappedText].join("\n");
    const { items, stats } = applyGuards(result, guardCorpus);

    let factsStored = 0;
    let edgesStored = 0;
    let entitiesMatched = 0;
    let entitiesProvisional = 0;
    let entitiesAmbiguous = 0;

    for (const item of items) {
      if (item.entities.length === 0) {
        continue;
      }
      const resolved = await resolveOrCreate(item);
      for (const info of resolved.values()) {
        if (info.outcome === "matched") {
          entitiesMatched += 1;
        } else if (info.outcome === "ambiguous-provisional") {
          entitiesAmbiguous += 1;
        } else {
          entitiesProvisional += 1;
        }
      }

      // Primary entity: the debtor hint when it matches, else the first entity.
      const primary =
        (debtorHint !== undefined
          ? [...resolved.values()].find((info) => info.name === debtorHint)
          : undefined) ?? [...resolved.values()][0];
      if (primary === undefined) {
        continue;
      }

      const ambiguity = [...resolved.values()]
        .filter((info) => info.outcome === "ambiguous-provisional")
        .map((info) => ({ name: info.name, candidates: info.candidates ?? [] }));

      const factData: Record<string, unknown> = {
        entities: [...resolved.values()].map((info) => info.entityId),
        excerpt_original: item.original_excerpt,
        language: result.language,
        ...(item.title_original !== undefined ? { title_original: item.title_original } : {}),
        ...(ambiguity.length > 0 ? { resolution: ambiguity } : {}),
      };

      // occurred_on is NOT NULL in the schema; when the document states no
      // date, fall back to the day the document was fetched.
      const occurredOn =
        item.occurred_on ?? (doc.fetchedAt ?? new Date()).toISOString().slice(0, 10);

      const insertedFact = await db
        .insert(timelineFacts)
        .values({
          entityId: primary.entityId,
          factType: item.fact_type,
          occurredOn,
          title: item.title_en,
          body: item.body_en,
          audienceChannels: item.channels,
          sourceDocumentId: documentId,
          confidence: item.confidence.toFixed(2),
          status: "proposed",
          data: factData,
        })
        .returning({ id: timelineFacts.id });
      if (insertedFact[0] !== undefined) {
        factsStored += 1;
      }

      for (const edge of item.proposedEdges) {
        const source = resolved.get(edge.sourceName);
        const target = resolved.get(edge.targetName);
        if (source === undefined || target === undefined) {
          continue;
        }
        await db.insert(edges).values({
          edgeType: edge.edgeType,
          sourceEntityId: source.entityId,
          targetEntityId: target.entityId,
          role: edge.role ?? null,
          startedOn: edge.date ?? null,
          // amountText stays raw; deterministic parsing happens in code, and
          // only when unambiguous — never in the model.
          amount: null,
          currency:
            edge.currencyHint !== undefined && /^[A-Za-z]{3}$/.test(edge.currencyHint)
              ? edge.currencyHint.toUpperCase()
              : null,
          sourceDocumentId: documentId,
          confidence: item.confidence.toFixed(2),
          status: "proposed",
        });
        edgesStored += 1;
      }
    }

    await stamp({
      status: "done",
      at: new Date().toISOString(),
      model: "claude-sonnet-4-6",
      items: items.length,
      factsStored,
      edgesStored,
      dropped: stats,
      usage,
    });
    return {
      status: "done",
      items: items.length,
      factsStored,
      edgesStored,
      entitiesMatched,
      entitiesProvisional,
      entitiesAmbiguous,
      guardStats: stats,
      usage,
      relevant: true,
      language: result.language,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await stamp({ status: "error", at: new Date().toISOString(), error: message });
    throw err;
  }
}

/** Best-effort "document/stored" event emission; silent no-op without a key. */
export async function emitDocumentStored(documentId: string): Promise<void> {
  if (!process.env.INNGEST_EVENT_KEY) {
    return;
  }
  try {
    const { inngest } = await import("../inngest");
    await inngest.send({ name: "document/stored", data: { documentId } });
  } catch (err) {
    console.warn(
      `document/stored emit failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

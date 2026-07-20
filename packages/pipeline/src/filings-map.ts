import { parseRegionalAmount, parseRegionalDate } from "@continuum/shared";
import {
  createEntity,
  db,
  documents,
  entities,
  eq,
  organizations,
  resolveEntity,
  timelineFacts,
} from "@continuum/db";

export type MappedFiling = {
  factId: string;
  entityId: string;
  outcome: "matched" | "provisional";
};

function metaString(meta: Record<string, unknown>, key: string): string | undefined {
  const value = meta[key];
  return typeof value === "string" && value !== "" ? value : undefined;
}

async function resolveDebtor(
  debtorName: string,
  registryId: string | undefined,
): Promise<{ entityId: string; outcome: "matched" | "provisional" }> {
  const resolution = await resolveEntity({
    name: debtorName,
    country: "RS",
    kindHint: "organization",
    ...(registryId !== undefined ? { registryId } : {}),
  });
  if (resolution.outcome === "matched" && resolution.entityId !== undefined) {
    return { entityId: resolution.entityId, outcome: "matched" };
  }
  const created = await createEntity({
    kind: "organization",
    name: debtorName,
    country: "RS",
  });
  await db.update(entities).set({ status: "provisional" }).where(eq(entities.id, created.id));
  // The matični broj makes future resolutions deterministic.
  await db.insert(organizations).values({
    entityId: created.id,
    ...(registryId !== undefined ? { registryId } : {}),
  });
  return { entityId: created.id, outcome: "provisional" };
}

/**
 * Deterministic, zero-LLM mapping of ALSU registry filings into proposed
 * timeline facts, driven ONLY by documents.meta captured by the Phase 9
 * handlers. Idempotent via documents.meta.mapped = true. Returns null when the
 * document is not a mappable ALSU filing or was already mapped.
 */
export async function mapFilingToFact(
  doc: typeof documents.$inferSelect,
): Promise<MappedFiling | null> {
  const meta = (doc.meta ?? {}) as Record<string, unknown>;
  const listing = metaString(meta, "listing");
  const debtorName = metaString(meta, "debtorName");
  if (
    (listing !== "alsu-stecajevi" && listing !== "alsu-prodaje") ||
    debtorName === undefined ||
    meta.mapped === true
  ) {
    return null;
  }

  const registryId = metaString(meta, "registryId");
  const { entityId, outcome } = await resolveDebtor(debtorName, registryId);
  const fallbackDate = (doc.fetchedAt ?? new Date()).toISOString().slice(0, 10);

  let factValues: typeof timelineFacts.$inferInsert;
  if (listing === "alsu-stecajevi") {
    const court = metaString(meta, "court");
    factValues = {
      entityId,
      factType: "insolvency_opened",
      occurredOn: parseRegionalDate(metaString(meta, "openedOn") ?? "") ?? fallbackDate,
      title: `Insolvency proceedings opened: ${debtorName}${court !== undefined ? ` (${court})` : ""}`,
      audienceChannels: ["distressed"],
      sourceDocumentId: doc.id,
      confidence: "0.95",
      status: "proposed",
      data: {
        entities: [entityId],
        source: "alsu-mapper",
        caseRef: metaString(meta, "caseRef") ?? null,
        court: court ?? null,
        administrator: metaString(meta, "administrator") ?? null,
        maticniBroj: registryId ?? null,
        city: metaString(meta, "city") ?? null,
      },
    };
  } else {
    const estimatedValueText = metaString(meta, "estimatedValue") ?? metaString(meta, "value");
    const startingValueText = metaString(meta, "startingPrice");
    factValues = {
      entityId,
      factType: "asset_sale_announced",
      occurredOn: parseRegionalDate(metaString(meta, "saleDate") ?? "") ?? fallbackDate,
      title: `Bankruptcy asset sale: ${debtorName}`,
      audienceChannels: ["distressed", "private_credit"],
      sourceDocumentId: doc.id,
      confidence: "0.95",
      status: "proposed",
      data: {
        entities: [entityId],
        source: "alsu-mapper",
        method: metaString(meta, "saleMethod") ?? null,
        place: metaString(meta, "place") ?? null,
        maticniBroj: registryId ?? null,
        estimatedValueText: estimatedValueText ?? null,
        startingValueText: startingValueText ?? null,
        // Deterministic code parses amounts; anything ambiguous stays null.
        estimatedValue:
          estimatedValueText !== undefined ? parseRegionalAmount(estimatedValueText) : null,
        startingValue:
          startingValueText !== undefined ? parseRegionalAmount(startingValueText) : null,
      },
    };
  }

  const inserted = await db
    .insert(timelineFacts)
    .values(factValues)
    .returning({ id: timelineFacts.id });
  const factId = inserted[0]?.id;
  if (factId === undefined) {
    throw new Error(`Filing mapper failed to insert fact for document ${doc.id}`);
  }
  await db
    .update(documents)
    .set({ meta: { ...meta, mapped: true } })
    .where(eq(documents.id, doc.id));
  return { factId, entityId, outcome };
}

export async function mapFilingById(documentId: string): Promise<MappedFiling | null> {
  const rows = await db.select().from(documents).where(eq(documents.id, documentId));
  const doc = rows[0];
  return doc === undefined ? null : mapFilingToFact(doc);
}

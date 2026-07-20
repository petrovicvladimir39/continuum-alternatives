import { and, db, entities, entityTags, eq, isNull, ne, or, sql } from "@continuum/db";
import { VoyageAIClient } from "voyageai";

/**
 * Embedding model + dimension are a pair: entities.embedding is vector(1024)
 * (migration 0007), so EMBEDDING_DIMENSION must match the column. voyage-3.5-lite
 * outputs 1024 dims by default; we still pass outputDimension explicitly so a
 * model default change upstream can never silently break the column.
 */
export const EMBEDDING_MODEL = "voyage-3.5-lite";
export const EMBEDDING_DIMENSION = 1024;

/** Voyage caps embed requests at 128 texts per call. */
const BATCH_SIZE = 128;

export function voyageClient(): VoyageAIClient | null {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    return null;
  }
  return new VoyageAIClient({ apiKey });
}

export type EmbeddableEntity = {
  name: string;
  kind: string;
  country: string | null;
  tags: string[];
  summary: string | null;
};

/** The canonical text embedded per entity — keep stable; changing it means re-embedding. */
export function embedEntityText(entity: EmbeddableEntity): string {
  return [
    entity.name,
    entity.kind,
    entity.country ?? "",
    entity.tags.join(", "),
    entity.summary ?? "",
  ]
    .filter((part) => part !== "")
    .join(". ");
}

async function embedTexts(
  client: VoyageAIClient,
  texts: string[],
  inputType: "document" | "query",
): Promise<{ vectors: number[][]; totalTokens: number }> {
  const vectors: number[][] = [];
  let totalTokens = 0;
  for (let start = 0; start < texts.length; start += BATCH_SIZE) {
    const batch = texts.slice(start, start + BATCH_SIZE);
    const response = await client.embed({
      input: batch,
      model: EMBEDDING_MODEL,
      inputType,
      outputDimension: EMBEDDING_DIMENSION,
    });
    const data = response.data ?? [];
    if (data.length !== batch.length) {
      throw new Error(`Voyage returned ${data.length} embeddings for ${batch.length} inputs`);
    }
    for (const item of data) {
      const vector = item.embedding;
      if (!vector || vector.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `Voyage embedding has dimension ${vector?.length ?? 0}, expected ${EMBEDDING_DIMENSION}`,
        );
      }
      vectors.push(vector);
    }
    totalTokens += response.usage?.totalTokens ?? 0;
  }
  return { vectors, totalTokens };
}

export async function embedQuery(client: VoyageAIClient, query: string): Promise<number[]> {
  const { vectors } = await embedTexts(client, [query], "query");
  const vector = vectors[0];
  if (!vector) {
    throw new Error("Voyage returned no embedding for query");
  }
  return vector;
}

export type BackfillResult = {
  skipped: boolean;
  reason?: string;
  embedded: number;
  alreadyCurrent: number;
  totalTokens: number;
};

/**
 * Embeds every active entity not yet embedded with the current model.
 * Tag aggregation happens in SQL so one round-trip covers the whole candidate set.
 */
export async function backfillEmbeddings(): Promise<BackfillResult> {
  const client = voyageClient();
  if (client === null) {
    return {
      skipped: true,
      reason: "VOYAGE_API_KEY is not set — skipping embeddings backfill (search falls back to ILIKE)",
      embedded: 0,
      alreadyCurrent: 0,
      totalTokens: 0,
    };
  }

  const alreadyCurrent = await db.$count(
    entities,
    and(eq(entities.status, "active"), eq(entities.embeddingModel, EMBEDDING_MODEL)),
  );

  const pending = await db
    .select({
      id: entities.id,
      name: entities.name,
      kind: entities.kind,
      country: entities.country,
      summary: entities.summary,
      tags: sql<
        string[]
      >`coalesce(array_agg(${entityTags.tag}) filter (where ${entityTags.tag} is not null), '{}')`,
    })
    .from(entities)
    .leftJoin(entityTags, eq(entityTags.entityId, entities.id))
    .where(
      and(
        eq(entities.status, "active"),
        or(isNull(entities.embeddingModel), ne(entities.embeddingModel, EMBEDDING_MODEL)),
      ),
    )
    .groupBy(entities.id);

  let embedded = 0;
  let totalTokens = 0;
  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    const { vectors, totalTokens: batchTokens } = await embedTexts(
      client,
      batch.map((row) => embedEntityText(row)),
      "document",
    );
    totalTokens += batchTokens;
    for (const [i, row] of batch.entries()) {
      const vector = vectors[i];
      if (!vector) {
        throw new Error(`No embedding returned for entity ${row.id}`);
      }
      await db
        .update(entities)
        .set({ embedding: vector, embeddingModel: EMBEDDING_MODEL, embeddedAt: new Date() })
        .where(eq(entities.id, row.id));
      embedded += 1;
    }
    console.log(`embedded ${Math.min(start + BATCH_SIZE, pending.length)}/${pending.length}`);
  }

  return { skipped: false, embedded, alreadyCurrent, totalTokens };
}

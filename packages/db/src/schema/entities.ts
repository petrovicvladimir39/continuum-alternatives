import {
  char,
  customType,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const geographyPoint = customType<{ data: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

export const entityKind = pgEnum("entity_kind", [
  "organization",
  "person",
  "fund_vehicle",
  "deal",
  "asset",
  "event",
]);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: entityKind("kind").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    country: char("country", { length: 2 }),
    geo: geographyPoint("geo"),
    status: text("status").default("active"),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    // Dimension is fixed to the model recorded in embedding_model
    // (voyage-3.5-lite @ 1024 — see @continuum/pipeline embeddings.ts).
    embedding: vector("embedding", { dimensions: 1024 }),
    embeddingModel: text("embedding_model"),
    embeddedAt: timestamp("embedded_at", { withTimezone: true }),
  },
  (t) => [index("entities_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops"))],
);

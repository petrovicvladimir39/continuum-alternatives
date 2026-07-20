ALTER TABLE "entities" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "embedding_model" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "embedded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "entities_embedding_idx" ON "entities" USING hnsw ("embedding" vector_cosine_ops);
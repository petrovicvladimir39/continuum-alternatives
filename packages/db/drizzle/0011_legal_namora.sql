ALTER TABLE "organizations" ADD COLUMN "enrichment" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "enriched_at" timestamp with time zone;
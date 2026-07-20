CREATE TYPE "public"."article_status" AS ENUM('proposed', 'published', 'rejected');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"headline" text NOT NULL,
	"deck" text,
	"body_md" text NOT NULL,
	"status" "article_status" DEFAULT 'proposed' NOT NULL,
	"channels" text[] DEFAULT '{}' NOT NULL,
	"primary_entity_id" uuid,
	"fact_ids" uuid[] DEFAULT '{}' NOT NULL,
	"source_document_ids" uuid[] DEFAULT '{}' NOT NULL,
	"byline" text DEFAULT 'Continuum Desk' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_primary_entity_id_entities_id_fk" FOREIGN KEY ("primary_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;
ALTER TYPE "public"."article_status" ADD VALUE 'draft';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "asset_class" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "strategy" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "authored_by" text DEFAULT 'desk_compose' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "source_urls" text[] DEFAULT '{}' NOT NULL;
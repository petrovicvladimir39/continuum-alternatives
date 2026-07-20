CREATE TABLE "digest_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"rank" integer NOT NULL,
	"included" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"digest_date" date NOT NULL,
	"status" text DEFAULT 'draft',
	"subject" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"sent_at" timestamp with time zone,
	"delivery" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "digests_digest_date_unique" UNIQUE("digest_date")
);
--> statement-breakpoint
ALTER TABLE "digest_items" ADD CONSTRAINT "digest_items_digest_id_digests_id_fk" FOREIGN KEY ("digest_id") REFERENCES "public"."digests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_items" ADD CONSTRAINT "digest_items_fact_id_timeline_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."timeline_facts"("id") ON DELETE no action ON UPDATE no action;
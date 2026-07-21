CREATE TABLE "ask_groundings" (
	"question_normalized" text PRIMARY KEY NOT NULL,
	"filters" jsonb NOT NULL,
	"cost_usd" numeric(10, 6),
	"hit_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "doc_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"member_id" uuid,
	"question_normalized" text NOT NULL,
	"answer" jsonb NOT NULL,
	"cost_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "member_daily_usage" (
	"member_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "member_daily_usage_member_id_kind_day_pk" PRIMARY KEY("member_id","kind","day")
);
--> statement-breakpoint
CREATE TABLE "scout_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"fact_type" text NOT NULL,
	"entity_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"entities_free" text,
	"occurred_on" date NOT NULL,
	"source_url" text NOT NULL,
	"note" text,
	"anonymous" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"published_fact_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "watchdog_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"body_md" text NOT NULL,
	"cost_usd" numeric(10, 6),
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "member_alert_prefs" ADD COLUMN "watchdog_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "doc_chats" ADD CONSTRAINT "doc_chats_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_chats" ADD CONSTRAINT "doc_chats_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_daily_usage" ADD CONSTRAINT "member_daily_usage_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scout_submissions" ADD CONSTRAINT "scout_submissions_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchdog_briefs" ADD CONSTRAINT "watchdog_briefs_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "doc_chats_doc_question_idx" ON "doc_chats" USING btree ("document_id","question_normalized");--> statement-breakpoint
CREATE INDEX "scout_submissions_member_idx" ON "scout_submissions" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "watchdog_briefs_member_week_idx" ON "watchdog_briefs" USING btree ("member_id","week_start");
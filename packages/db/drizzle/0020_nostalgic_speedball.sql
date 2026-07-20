CREATE TABLE "member_export_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"params" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "member_subscriptions" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"price_id" text,
	"current_period_end" timestamp with time zone,
	"founding" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brief_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid,
	"entity_id" uuid NOT NULL,
	"cost_usd" numeric(10, 6),
	"input_tokens" integer,
	"output_tokens" integer,
	"outcome" text DEFAULT 'stored' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "entity_briefs" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"data_version" text NOT NULL,
	"model" text NOT NULL,
	"generated_by_member_id" uuid,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 6),
	"generated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "member_export_log" ADD CONSTRAINT "member_export_log_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brief_generations" ADD CONSTRAINT "brief_generations_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brief_generations" ADD CONSTRAINT "brief_generations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_briefs" ADD CONSTRAINT "entity_briefs_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_briefs" ADD CONSTRAINT "entity_briefs_generated_by_member_id_member_profiles_id_fk" FOREIGN KEY ("generated_by_member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_export_log_member_created_idx" ON "member_export_log" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "brief_generations_member_created_idx" ON "brief_generations" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "brief_generations_created_idx" ON "brief_generations" USING btree ("created_at");
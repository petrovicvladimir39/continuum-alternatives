CREATE TABLE "alert_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"ref_id" uuid NOT NULL,
	"entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"sent_at" timestamp with time zone,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_alert_prefs" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"last_digested_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_watchlist" (
	"member_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "member_watchlist_member_id_entity_id_pk" PRIMARY KEY("member_id","entity_id")
);
--> statement-breakpoint
ALTER TABLE "member_saved_views" ADD COLUMN "alert_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_outbox" ADD CONSTRAINT "alert_outbox_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_outbox" ADD CONSTRAINT "alert_outbox_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_alert_prefs" ADD CONSTRAINT "member_alert_prefs_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_watchlist" ADD CONSTRAINT "member_watchlist_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_watchlist" ADD CONSTRAINT "member_watchlist_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_outbox_member_kind_ref_idx" ON "alert_outbox" USING btree ("member_id","kind","ref_id");
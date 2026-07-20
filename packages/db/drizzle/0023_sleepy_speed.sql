CREATE TABLE "member_private_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"contact_display" text NOT NULL,
	"contact_org_raw" text,
	"contact_org_entity_id" uuid,
	"position_raw" text,
	"connected_on" date,
	"source" text DEFAULT 'linkedin_upload' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contact_requests" ALTER COLUMN "event_entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "organization_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD COLUMN "context_kind" text DEFAULT 'event' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD COLUMN "intro_target_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "member_private_edges" ADD CONSTRAINT "member_private_edges_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_private_edges" ADD CONSTRAINT "member_private_edges_contact_org_entity_id_entities_id_fk" FOREIGN KEY ("contact_org_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_private_edges_member_idx" ON "member_private_edges" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_organization_entity_id_entities_id_fk" FOREIGN KEY ("organization_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_intro_target_entity_id_entities_id_fk" FOREIGN KEY ("intro_target_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_requests_pair_target_idx" ON "contact_requests" USING btree ("from_member_id","to_member_id","intro_target_entity_id");
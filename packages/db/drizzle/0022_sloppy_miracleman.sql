CREATE TABLE "contact_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_member_id" uuid NOT NULL,
	"to_member_id" uuid NOT NULL,
	"event_entity_id" uuid NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "event_attendance" (
	"member_id" uuid NOT NULL,
	"event_entity_id" uuid NOT NULL,
	"status" text NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_attendance_member_id_event_entity_id_pk" PRIMARY KEY("member_id","event_entity_id")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "expected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_from_member_id_member_profiles_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_to_member_id_member_profiles_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_event_entity_id_entities_id_fk" FOREIGN KEY ("event_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_event_entity_id_entities_id_fk" FOREIGN KEY ("event_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_requests_pair_event_idx" ON "contact_requests" USING btree ("from_member_id","to_member_id","event_entity_id");
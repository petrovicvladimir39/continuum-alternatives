CREATE TABLE "entity_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"source" text NOT NULL,
	"raw_address" text,
	"lat" double precision,
	"lon" double precision,
	"precision" text,
	"location_confidence" numeric,
	"geocoded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "entity_locations" ADD CONSTRAINT "entity_locations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entity_locations_entity_source_idx" ON "entity_locations" USING btree ("entity_id","source");--> statement-breakpoint
CREATE INDEX "entity_locations_latlon_idx" ON "entity_locations" USING btree ("lat","lon");
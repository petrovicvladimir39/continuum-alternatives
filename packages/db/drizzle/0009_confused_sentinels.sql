CREATE TABLE "city_geocodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" char(2) NOT NULL,
	"city_normalized" text NOT NULL,
	"city_display" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"source" text DEFAULT 'nominatim',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "city_geocodes_country_city_idx" ON "city_geocodes" USING btree ("country","city_normalized");
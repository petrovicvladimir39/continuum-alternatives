CREATE TABLE "anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension" text NOT NULL,
	"dimension_key" text NOT NULL,
	"period_week" date NOT NULL,
	"observed" integer NOT NULL,
	"baseline_mean" numeric NOT NULL,
	"baseline_std" numeric NOT NULL,
	"z" numeric NOT NULL,
	"status" text DEFAULT 'new',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "anomalies_dimension_key_week_idx" ON "anomalies" USING btree ("dimension","dimension_key","period_week");
CREATE TABLE "entity_classifications" (
	"entity_id" uuid NOT NULL,
	"asset_class" text NOT NULL,
	"strategy" text DEFAULT '' NOT NULL,
	"source" text NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "entity_classifications_entity_id_asset_class_strategy_pk" PRIMARY KEY("entity_id","asset_class","strategy")
);
--> statement-breakpoint
ALTER TABLE "fund_vehicles" ADD COLUMN "strategy_raw" text;--> statement-breakpoint
ALTER TABLE "entity_classifications" ADD CONSTRAINT "entity_classifications_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Phase 26A: legacy free-text fund strategies preserved verbatim, then
-- mapped to taxonomy slugs (same priority order as mapLegacyFundStrategy in
-- @continuum/shared); unmappable values keep strategy NULL + the raw text.
UPDATE "fund_vehicles" SET "strategy_raw" = "strategy" WHERE "strategy" IS NOT NULL;--> statement-breakpoint
UPDATE "fund_vehicles" SET "strategy" = CASE
  WHEN "strategy_raw" ~* 'buyout|lbo' THEN 'lbo'
  WHEN "strategy_raw" ~* 'venture|seed|early' THEN 'venture_capital'
  WHEN "strategy_raw" ~* 'growth' THEN 'growth_equity'
  WHEN "strategy_raw" ~* 'mezz' THEN 'mezzanine'
  WHEN "strategy_raw" ~* 'secondar' THEN 'secondaries'
  WHEN "strategy_raw" ~* 'distress|special sit|npl|workout' THEN 'distressed_debt'
  WHEN "strategy_raw" ~* 'direct lend|senior|unitranche|private credit|private debt|credit|debt' THEN 'direct_lending'
  WHEN "strategy_raw" ~* 'infrastruct' THEN 'infrastructure_economic'
  WHEN "strategy_raw" ~* 'real estate|property' THEN 're_core_income'
  ELSE NULL END
WHERE "strategy_raw" IS NOT NULL;

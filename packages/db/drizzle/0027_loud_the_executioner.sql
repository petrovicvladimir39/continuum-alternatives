CREATE TYPE "public"."source_tier" AS ENUM('tier1_registry', 'tier2_regulator', 'tier3_gazette', 'tier4_exchange_corporate', 'signals_press');--> statement-breakpoint
CREATE TABLE "ecb_rates" (
	"rate_date" date NOT NULL,
	"currency" char(3) NOT NULL,
	"rate_per_eur" numeric NOT NULL,
	CONSTRAINT "ecb_rates_rate_date_currency_pk" PRIMARY KEY("rate_date","currency")
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "commercial_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "lei_code" char(20);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_form_native" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_form_standardized" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "incorporation_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_status" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "regulatory_status" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "primary_regulator" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "regulatory_license_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "registered_address" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "hq_country" char(2);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "corporate_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "corporate_phone" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "primary_role" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "secondary_roles" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "target_geo_scope" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "share_capital" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "aum_eur" numeric;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "capital_raised_eur" numeric;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reporting_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "category_fields" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_source" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "source_tier" "source_tier";--> statement-breakpoint
ALTER TABLE "entity_classifications" ADD COLUMN "sub_class" text;--> statement-breakpoint
-- EUROPE DEPTH RUN backfills (deterministic, $0) ------------------------------
-- Authority-tier backfill for the existing catalog. All current source_type
-- 'registry' rows are regulator/register feeds → tier2; GLEIF + national
-- commercial registers are re-stamped tier1 by name; gazettes/courts → tier3;
-- associations/newsrooms/directories → tier4; press and the rest → signals.
UPDATE "sources" SET "source_tier" = CASE
  WHEN "source_type" = 'registry' THEN 'tier2_regulator'::"source_tier"
  WHEN "source_type" IN ('gazette', 'court') THEN 'tier3_gazette'::"source_tier"
  WHEN "source_type" IN ('association', 'fund_site', 'company_site') THEN 'tier4_exchange_corporate'::"source_tier"
  ELSE 'signals_press'::"source_tier"
END
WHERE "source_tier" IS NULL;--> statement-breakpoint
UPDATE "sources" SET "source_tier" = 'tier1_registry'
WHERE ("name" ILIKE '%gleif%' OR "name" ILIKE '%lei%register%' OR "name" ILIKE '%commercial register%'
   OR "name" ILIKE '%handelsregister%' OR "name" ILIKE '%companies house%' OR "name" ILIKE '%apr %'
   OR "name" ILIKE '%sudski registar%' OR "name" ILIKE '%ajpes%')
  AND "source_type" = 'registry';--> statement-breakpoint
-- LEI backfill: organizations created by the GLEIF harvest store the bare
-- 20-char LEI in registry_id — copy it into the dedicated lei_code column.
UPDATE "organizations" SET "lei_code" = "registry_id"
WHERE "lei_code" IS NULL AND "registry_id" ~ '^[A-Z0-9]{18}[0-9]{2}$';
-- ── EXPLICITLY EXCLUDED FIELDS (constitution §5 — recorded here on purpose) ──
-- · estimated_dry_powder / target_irr: estimation of non-public figures is
--   BANNED; only publicly-stated financials are stored (aum_eur etc.).
-- · person linkedin_url harvesting at scale: consent doctrine — individuals'
--   personal data is never collected in bulk.
-- · ubo_* (ultimate beneficial owners): EU public UBO access was restricted
--   by the CJEU (Nov 2022, C-37/20); access is legitimate-interest gated per
--   member state. A future legal-gated decision, deliberately NOT a column.
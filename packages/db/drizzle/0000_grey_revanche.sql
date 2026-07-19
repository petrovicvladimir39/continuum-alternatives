CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('organization', 'person', 'fund_vehicle', 'deal', 'asset', 'event');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('npl_portfolio', 'property', 'company_stake', 'loan_book');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('vc_round', 'pe_buyout', 'growth_equity', 'acquisition', 'exit', 'npl_sale', 'credit_facility', 'refinancing', 'insolvency_process', 'restructuring');--> statement-breakpoint
CREATE TYPE "public"."event_format" AS ENUM('in_person', 'online', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."edge_type" AS ENUM('invested_in', 'lp_in', 'manages', 'acquired', 'advised_on', 'lent_to', 'pledged_collateral_for', 'serviced_by', 'sold_portfolio_to', 'founded', 'employed_by', 'board_member_of', 'co_invested_with', 'regulated_by', 'litigated_against', 'sponsored', 'attended');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('proposed', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('press', 'registry', 'gazette', 'court', 'fund_site', 'company_site', 'association', 'other');--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "entity_kind" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" char(2),
	"geo" geography(Point,4326),
	"status" text DEFAULT 'active',
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "entities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"nominal_value" numeric,
	"currency" char(3)
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"deal_type" "deal_type" NOT NULL,
	"announced_on" date,
	"amount" numeric,
	"currency" char(3),
	"deal_status" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"event_format" "event_format" NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"venue" text,
	"city" text,
	"event_url" text
);
--> statement-breakpoint
CREATE TABLE "fund_vehicles" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"manager_entity_id" uuid,
	"vintage_year" integer,
	"target_size" numeric,
	"currency" char(3),
	"strategy" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text,
	"registry_id" text,
	"tax_id" text,
	"hq_city" text,
	"founded_year" integer,
	"website" text,
	"employee_range" text
);
--> statement-breakpoint
CREATE TABLE "people" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"role_title" text,
	"linkedin_url" text
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edge_type" "edge_type" NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"deal_entity_id" uuid,
	"role" text,
	"started_on" date,
	"ended_on" date,
	"amount" numeric,
	"currency" char(3),
	"source_document_id" uuid,
	"confidence" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"status" "review_status" DEFAULT 'approved' NOT NULL,
	"verified_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timeline_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"fact_type" text NOT NULL,
	"occurred_on" date NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"audience_channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_document_id" uuid,
	"confidence" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"status" "review_status" DEFAULT 'approved',
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid,
	"alias" text NOT NULL,
	"alias_normalized" text NOT NULL,
	"lang" char(2)
);
--> statement-breakpoint
CREATE TABLE "entity_tags" (
	"entity_id" uuid NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "entity_tags_entity_id_tag_pk" PRIMARY KEY("entity_id","tag")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"url" text,
	"title" text,
	"language" char(2),
	"doc_type" text,
	"content_hash" text,
	"fetched_at" timestamp with time zone,
	"storage_ref" text
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"status" text,
	"stats" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"country" char(2),
	"source_type" "source_type" NOT NULL,
	"fetch_method" text,
	"schedule" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text,
	"org" text,
	"channels" text[] DEFAULT '{}'::text[],
	"consent_source" text,
	"consented_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anchor_entity_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'dormant',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_vehicles" ADD CONSTRAINT "fund_vehicles_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_vehicles" ADD CONSTRAINT "fund_vehicles_manager_entity_id_entities_id_fk" FOREIGN KEY ("manager_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_entity_id_entities_id_fk" FOREIGN KEY ("source_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_entity_id_entities_id_fk" FOREIGN KEY ("target_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_deal_entity_id_entities_id_fk" FOREIGN KEY ("deal_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_facts" ADD CONSTRAINT "timeline_facts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_facts" ADD CONSTRAINT "timeline_facts_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_anchor_entity_id_entities_id_fk" FOREIGN KEY ("anchor_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "edges_source_entity_id_idx" ON "edges" USING btree ("source_entity_id");--> statement-breakpoint
CREATE INDEX "edges_target_entity_id_idx" ON "edges" USING btree ("target_entity_id");--> statement-breakpoint
CREATE INDEX "edges_edge_type_idx" ON "edges" USING btree ("edge_type");--> statement-breakpoint
CREATE INDEX "edges_deal_entity_id_idx" ON "edges" USING btree ("deal_entity_id");--> statement-breakpoint
CREATE INDEX "timeline_facts_entity_occurred_idx" ON "timeline_facts" USING btree ("entity_id","occurred_on");--> statement-breakpoint
CREATE INDEX "timeline_facts_audience_channels_idx" ON "timeline_facts" USING gin ("audience_channels");--> statement-breakpoint
CREATE INDEX "aliases_alias_normalized_idx" ON "aliases" USING btree ("alias_normalized");
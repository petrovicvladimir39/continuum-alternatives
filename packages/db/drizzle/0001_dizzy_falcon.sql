CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TYPE "public"."deal_type" ADD VALUE 'fund_close';--> statement-breakpoint
ALTER TYPE "public"."edge_type" ADD VALUE 'divested';--> statement-breakpoint
ALTER TYPE "public"."edge_type" ADD VALUE 'originated';--> statement-breakpoint
ALTER TYPE "public"."edge_type" ADD VALUE 'audits';--> statement-breakpoint
ALTER TYPE "public"."edge_type" ADD VALUE 'values';--> statement-breakpoint
ALTER TYPE "public"."edge_type" ADD VALUE 'incubated';

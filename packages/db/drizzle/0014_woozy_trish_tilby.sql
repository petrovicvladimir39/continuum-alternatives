ALTER TABLE "contacts" ADD COLUMN "status" text DEFAULT 'pending_confirmation' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "confirmation_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_confirmation_token_unique" UNIQUE("confirmation_token");--> statement-breakpoint
-- Legacy contacts (report-gate leads, pre-Phase-23 digest list) consented
-- before the double-opt-in machine existed: consented+never-unsubscribed rows
-- stay live as 'active'; unsubscribed timestamps win.
UPDATE "contacts" SET "status" = 'active' WHERE "consented_at" IS NOT NULL AND "unsubscribed_at" IS NULL;--> statement-breakpoint
UPDATE "contacts" SET "status" = 'unsubscribed' WHERE "unsubscribed_at" IS NOT NULL;

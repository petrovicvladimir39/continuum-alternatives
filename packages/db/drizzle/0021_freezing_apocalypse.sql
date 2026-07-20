CREATE TABLE "item_reactions" (
	"member_id" uuid NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "item_reactions_member_id_target_kind_target_id_pk" PRIMARY KEY("member_id","target_kind","target_id")
);
--> statement-breakpoint
CREATE TABLE "post_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "thread_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anchor_kind" text NOT NULL,
	"anchor_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "role_title" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "organization" text;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "banned_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "item_reactions" ADD CONSTRAINT "item_reactions_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_thread_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."thread_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_posts" ADD CONSTRAINT "thread_posts_member_id_member_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_reactions_target_idx" ON "item_reactions" USING btree ("target_kind","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_reports_post_member_idx" ON "post_reports" USING btree ("post_id","member_id");--> statement-breakpoint
CREATE INDEX "thread_posts_anchor_idx" ON "thread_posts" USING btree ("anchor_kind","anchor_id","created_at");
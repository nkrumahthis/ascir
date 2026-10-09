CREATE TYPE "public"."entity_type" AS ENUM('post', 'person', 'event', 'organization');--> statement-breakpoint
CREATE TABLE "revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "revision" ADD CONSTRAINT "revision_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revision_entity_idx" ON "revision" USING btree ("entity_type","entity_id","created_at");
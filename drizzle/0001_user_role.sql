-- Idempotent: an earlier draft of T05 added this column by hand on some databases.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'subscriber' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_role_check') THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("user"."role" IN ('subscriber', 'author', 'editor', 'admin', 'super_admin'));
  END IF;
END $$;

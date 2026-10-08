-- T05: one role per user, stored on the Better Auth user record.
-- Every existing and new user starts as subscriber. Promote accounts by hand.
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'subscriber';

ALTER TABLE "user"
  ADD CONSTRAINT "user_role_check"
  CHECK ("role" IN ('subscriber', 'author', 'editor', 'admin', 'super_admin'));

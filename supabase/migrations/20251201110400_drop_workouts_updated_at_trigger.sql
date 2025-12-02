-- Explicitly drop the update_workouts_updated_at trigger from old schema

DROP TRIGGER IF EXISTS "update_workouts_updated_at" ON "public"."workouts";

-- Also drop the column if it exists
ALTER TABLE workouts DROP COLUMN IF EXISTS updated_at;

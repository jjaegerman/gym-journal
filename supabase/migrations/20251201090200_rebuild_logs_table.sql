-- Rebuild logs table with new event-sourcing schema
-- Drop all existing data (fresh start - no users yet)

-- Drop all existing logs
TRUNCATE logs CASCADE;

-- Drop RLS policies that depend on exercise_id
DROP POLICY IF EXISTS "Users can insert logs only for their exercises" ON logs;
DROP POLICY IF EXISTS "Users can modify logs only for their exercises" ON logs;
DROP POLICY IF EXISTS "Users can delete logs only for their exercises" ON logs;
DROP POLICY IF EXISTS "Users can view logs only for their exercises" ON logs;

-- Drop old exercise_id reference (we're removing exercises table)
ALTER TABLE logs DROP COLUMN IF EXISTS exercise_id;

-- Add new columns for direct workout reference
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES workout_submissions(id) ON DELETE SET NULL;

-- Add exercise metadata columns (moved from exercises table)
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS exercise_type TEXT,
  ADD COLUMN IF NOT EXISTS exercise_variant TEXT,
  ADD COLUMN IF NOT EXISTS exercise_equipment TEXT;

-- Make workout_id required
ALTER TABLE logs
  ALTER COLUMN workout_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logs_workout
  ON logs(workout_id);

CREATE INDEX IF NOT EXISTS idx_logs_submission
  ON logs(submission_id) WHERE submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_logs_exercise_type
  ON logs(exercise_type);

-- Documentation
COMMENT ON COLUMN logs.workout_id IS
  'Direct reference to workout - no intermediate exercises table';

COMMENT ON COLUMN logs.submission_id IS
  'Links derived log back to source submission for audit trail and reprocessing';

COMMENT ON COLUMN logs.exercise_type IS
  'Exercise category (Squat, Bench Press, etc.) - denormalized from exercises table';

COMMENT ON COLUMN logs.exercise_variant IS
  'Exercise variant (Back Squat, Incline Bench, etc.) - denormalized from exercises table';

COMMENT ON COLUMN logs.exercise_equipment IS
  'Primary equipment used (Barbell, Dumbbell, etc.) - denormalized from exercises table';

-- Update exercise schema: variant → variants array, add exercise_name
-- Changes:
-- 1. exercise_variant TEXT → exercise_variants JSONB (array of strings)
-- 2. Add exercise_name TEXT for "Other" category exercises

-- Drop the view first (it depends on exercise_variant column)
DROP VIEW IF EXISTS workout_exercises;

-- Add new columns
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS exercise_variants JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exercise_name TEXT;

-- Migrate existing exercise_variant data to exercise_variants array
-- If variant exists and is not empty, split on spaces and store as array
UPDATE logs
SET exercise_variants =
  CASE
    WHEN exercise_variant IS NOT NULL AND exercise_variant != ''
    THEN to_jsonb(string_to_array(exercise_variant, ' '))
    ELSE '[]'::jsonb
  END
WHERE exercise_variants = '[]'::jsonb;

-- Now drop old exercise_variant column
ALTER TABLE logs DROP COLUMN IF EXISTS exercise_variant;

-- Create GIN index for variant queries
CREATE INDEX IF NOT EXISTS idx_logs_exercise_variants
  ON logs USING GIN (exercise_variants);

-- Create index for exercise_name
CREATE INDEX IF NOT EXISTS idx_logs_exercise_name
  ON logs(exercise_name) WHERE exercise_name IS NOT NULL;

-- Update comments
COMMENT ON COLUMN logs.exercise_variants IS
  'Array of variant modifiers (e.g., ["Incline", "Close Grip"]) - sorted alphabetically for display';

COMMENT ON COLUMN logs.exercise_name IS
  'Exercise name for generic categories (e.g., "Burpees" when type is "Cardio Other")';

-- Recreate the workout_exercises view to use new schema
CREATE OR REPLACE VIEW workout_exercises AS
SELECT
  l.workout_id,
  l.exercise_type as type,
  l.exercise_variants as variants,
  l.exercise_equipment as equipment,
  l.exercise_name as name,

  -- Aggregated metrics
  COUNT(*) as total_sets,
  MAX(l.weight) as max_weight,
  MAX(l.repetitions) as max_reps,
  AVG(l.weight) FILTER (WHERE l.weight IS NOT NULL) as avg_weight,
  SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as total_volume,
  SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) as total_distance,

  -- Timestamps
  MIN(l.datetime) as first_logged,
  MAX(l.datetime) as last_logged,
  MIN(l.datetime) as datetime  -- For sorting/ordering
FROM logs l
WHERE l.exercise_type IS NOT NULL
GROUP BY
  l.workout_id,
  l.exercise_type,
  l.exercise_variants,
  l.exercise_equipment,
  l.exercise_name;

-- Grant access to authenticated users
GRANT SELECT ON workout_exercises TO authenticated;

-- Documentation
COMMENT ON VIEW workout_exercises IS
  'Groups logs by exercise within a workout - groups by {variants, equipment, type, name}';

-- Fix NULL exercise_variants - should be [] not null

-- Update all NULL exercise_variants to empty array
UPDATE logs
SET exercise_variants = '[]'::jsonb
WHERE exercise_variants IS NULL;

-- Set NOT NULL constraint with default
ALTER TABLE logs
  ALTER COLUMN exercise_variants SET DEFAULT '[]'::jsonb,
  ALTER COLUMN exercise_variants SET NOT NULL;

-- Recreate workout_exercises view with COALESCE for safety
DROP VIEW IF EXISTS workout_exercises;

CREATE OR REPLACE VIEW workout_exercises AS
SELECT
  l.workout_id,
  l.exercise_type as type,
  COALESCE(l.exercise_variants, '[]'::jsonb) as variants,
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

GRANT SELECT ON workout_exercises TO authenticated;

COMMENT ON VIEW workout_exercises IS
  'Groups logs by exercise within a workout - groups by {variants, equipment, type, name}';

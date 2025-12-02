-- Replace exercises table with a view that groups logs by exercise
-- This eliminates redundant data and simplifies the schema

-- Drop the old exercises table
DROP TABLE IF EXISTS exercises CASCADE;

-- Create view to group logs by exercise within a workout
CREATE OR REPLACE VIEW workout_exercises AS
SELECT
  l.workout_id,
  l.exercise_type as type,
  l.exercise_variant as variant,
  l.exercise_equipment as equipment,

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
  l.exercise_variant,
  l.exercise_equipment;

-- Grant access to authenticated users
GRANT SELECT ON workout_exercises TO authenticated;

-- Documentation
COMMENT ON VIEW workout_exercises IS
  'Groups logs by exercise within a workout - replaces exercises table';

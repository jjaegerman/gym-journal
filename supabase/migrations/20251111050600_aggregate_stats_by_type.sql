-- Update get_exercise_stats to aggregate by exercise type only
DROP FUNCTION IF EXISTS get_exercise_stats(uuid, integer);

CREATE FUNCTION get_exercise_stats(
  p_user_id uuid,
  p_days_back integer DEFAULT 90
)
RETURNS TABLE(
  exercise_type text,
  total_workouts bigint,
  total_sets bigint,
  max_weight numeric,
  max_reps integer,
  max_volume numeric,
  avg_weight numeric,
  workouts_per_week numeric,
  first_logged timestamp with time zone,
  last_logged timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(e.type, 'Other') as exercise_type,
    COUNT(DISTINCT w.id) as total_workouts,
    COUNT(l.id) as total_sets,
    MAX(l.weight) as max_weight,
    MAX(l.repetitions) as max_reps,
    MAX(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as max_volume,
    AVG(l.weight) as avg_weight,
    (COUNT(DISTINCT w.id)::numeric /
      GREATEST(1, EXTRACT(EPOCH FROM (MAX(w.datetime) - MIN(w.datetime))) / 604800)
    ) as workouts_per_week,
    MIN(w.datetime) as first_logged,
    MAX(w.datetime) as last_logged
  FROM workouts w
  JOIN exercises e ON e.workout_id = w.id
  JOIN logs l ON l.exercise_id = e.id
  WHERE w.user_id = p_user_id
    AND w.datetime >= NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY e.type
  ORDER BY COUNT(DISTINCT w.id) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_exercise_stats(uuid, integer) TO authenticated;

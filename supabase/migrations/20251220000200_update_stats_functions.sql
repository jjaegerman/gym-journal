-- Update stats functions to group by {variants, equipment, type}
-- Changes get_exercise_stats to group by full exercise specification instead of just type

DROP FUNCTION IF EXISTS public.get_exercise_stats(integer);

CREATE OR REPLACE FUNCTION public.get_exercise_stats(
  p_days_back integer DEFAULT 90
)
RETURNS TABLE(
  exercise_type text,
  exercise_variants jsonb,
  exercise_equipment text,
  total_workouts bigint,
  total_sets bigint,
  max_weight numeric,
  max_reps integer,
  max_volume numeric,
  avg_weight numeric,
  workouts_per_week numeric,
  first_logged timestamp with time zone,
  last_logged timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(l.exercise_type, 'Other') as exercise_type,
    COALESCE(l.exercise_variants, '[]'::jsonb) as exercise_variants,
    l.exercise_equipment,
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
  JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND w.datetime >= NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY l.exercise_type, l.exercise_variants, l.exercise_equipment
  ORDER BY COUNT(DISTINCT w.id) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_stats(integer) TO authenticated;

COMMENT ON FUNCTION public.get_exercise_stats IS
  'Returns exercise statistics grouped by {variants, equipment, type} for better granularity';

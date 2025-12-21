-- Fix exercise stats - duration is INTEGER (seconds), not INTERVAL

DROP FUNCTION IF EXISTS public.get_exercise_stats(text);

CREATE OR REPLACE FUNCTION public.get_exercise_stats(
  p_timeframe TEXT DEFAULT 'all-time'  -- 'all-time' or 'recent' (4 weeks)
)
RETURNS TABLE(
  exercise_type text,
  exercise_variants jsonb,
  exercise_equipment text,
  total_workouts bigint,
  total_sets bigint,
  max_weight numeric,
  max_distance numeric,
  max_volume numeric,
  avg_pace numeric,  -- minutes per mile for cardio
  last_logged timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Set cutoff date based on timeframe
  IF p_timeframe = 'recent' THEN
    v_cutoff_date := NOW() - INTERVAL '4 weeks';
  ELSE
    v_cutoff_date := '1970-01-01'::TIMESTAMPTZ;  -- All time
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(l.exercise_type, 'Other') as exercise_type,
    COALESCE(l.exercise_variants, '[]'::jsonb) as exercise_variants,
    l.exercise_equipment,
    COUNT(DISTINCT w.id) as total_workouts,
    COUNT(l.id) as total_sets,
    MAX(l.weight) as max_weight,
    MAX(l.distance) as max_distance,
    MAX(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as max_volume,
    -- Avg pace: duration (integer seconds) / 60 / distance in miles
    AVG(
      CASE
        WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
        THEN (l.duration::NUMERIC / 60.0) / l.distance
        ELSE NULL
      END
    ) as avg_pace,
    MAX(w.datetime) as last_logged
  FROM workouts w
  JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND w.datetime >= v_cutoff_date
  GROUP BY l.exercise_type, l.exercise_variants, l.exercise_equipment
  ORDER BY COUNT(DISTINCT w.id) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_stats(text) TO authenticated;

COMMENT ON FUNCTION public.get_exercise_stats IS
  'Returns exercise statistics for all-time or recent (4 weeks) timeframe';

-- Fix stats functions to use logs table instead of exercises table

DROP FUNCTION IF EXISTS public.get_user_profile_stats(integer, text);

CREATE OR REPLACE FUNCTION public.get_user_profile_stats(
  p_days_back integer DEFAULT 90,
  p_timezone text DEFAULT 'UTC'::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_workouts_count integer;
  total_hours_count numeric;
  workouts_30_days integer;
  workouts_7_days integer;
  current_streak_val integer;
  longest_streak_val integer;
  avg_workouts_per_week numeric;
  most_common_day text;
BEGIN
  -- Calculate basic stats with workout duration
  -- Duration = time between first and last log in a workout
  WITH workout_durations AS (
    SELECT
      w.id,
      w.datetime,
      EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/3600 as duration_hours
    FROM workouts w
    LEFT JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY w.id, w.datetime
  )
  SELECT
    COUNT(DISTINCT id),
    COALESCE(SUM(duration_hours), 0),
    COUNT(DISTINCT id) FILTER (WHERE datetime >= NOW() - INTERVAL '30 days'),
    COUNT(DISTINCT id) FILTER (WHERE datetime >= NOW() - INTERVAL '7 days')
  INTO
    total_workouts_count,
    total_hours_count,
    workouts_30_days,
    workouts_7_days
  FROM workout_durations;

  -- Calculate streaks
  SELECT calculate_current_streak() INTO current_streak_val;
  SELECT calculate_longest_streak() INTO longest_streak_val;

  -- Calculate average workouts per week (last 12 weeks)
  SELECT
    (COUNT(DISTINCT w.id)::numeric / 12)
  INTO avg_workouts_per_week
  FROM workouts w
  WHERE w.user_id = auth.uid()
    AND w.datetime >= NOW() - INTERVAL '12 weeks';

  -- Find most common workout day (converted to user's timezone)
  SELECT
    TO_CHAR(w.datetime AT TIME ZONE p_timezone, 'Day')
  INTO most_common_day
  FROM workouts w
  WHERE w.user_id = auth.uid()
  GROUP BY TO_CHAR(w.datetime AT TIME ZONE p_timezone, 'Day'), EXTRACT(DOW FROM w.datetime AT TIME ZONE p_timezone)
  ORDER BY COUNT(*) DESC, EXTRACT(DOW FROM w.datetime AT TIME ZONE p_timezone)
  LIMIT 1;

  -- Build result
  result := jsonb_build_object(
    'total_workouts', total_workouts_count,
    'total_hours', ROUND(total_hours_count, 1),
    'workouts_last_30_days', workouts_30_days,
    'workouts_last_7_days', workouts_7_days,
    'current_streak_days', current_streak_val,
    'longest_streak_days', longest_streak_val,
    'avg_workouts_per_week', ROUND(avg_workouts_per_week, 1),
    'most_common_day', TRIM(COALESCE(most_common_day, 'N/A'))
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_stats(integer, text) TO authenticated;

-- Fix get_exercise_stats

DROP FUNCTION IF EXISTS public.get_exercise_stats(integer);

CREATE OR REPLACE FUNCTION public.get_exercise_stats(
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
  GROUP BY l.exercise_type
  ORDER BY COUNT(DISTINCT w.id) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_stats(integer) TO authenticated;

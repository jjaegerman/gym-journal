-- Fix NULL handling in profile stats calculation

DROP FUNCTION IF EXISTS public.get_user_profile_stats();

CREATE OR REPLACE FUNCTION public.get_user_profile_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;

  -- All-time stats
  total_workouts_count INTEGER;
  total_hours_count NUMERIC;
  current_streak_val INTEGER;
  longest_streak_val INTEGER;

  -- Recent (last 4 weeks) stats
  recent_workouts_per_week NUMERIC;
  recent_hours_per_week NUMERIC;
  recent_avg_duration NUMERIC;
  recent_total_volume NUMERIC;
  recent_total_distance NUMERIC;

  -- Previous 4 weeks (for comparison)
  prev_workouts_per_week NUMERIC;
  prev_hours_per_week NUMERIC;
  prev_avg_duration NUMERIC;
  prev_total_volume NUMERIC;
  prev_total_distance NUMERIC;
BEGIN
  -- All-time: total workouts and hours
  WITH workout_durations AS (
    SELECT
      w.id,
      w.datetime,
      CASE
        WHEN MAX(l.datetime) IS NOT NULL AND MIN(l.datetime) IS NOT NULL
        THEN EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/3600.0
        ELSE 0
      END as duration_hours
    FROM workouts w
    LEFT JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
    GROUP BY w.id, w.datetime
  )
  SELECT
    COUNT(DISTINCT id)::INTEGER,
    COALESCE(SUM(duration_hours), 0)::NUMERIC
  INTO
    total_workouts_count,
    total_hours_count
  FROM workout_durations;

  -- Calculate streaks
  SELECT COALESCE(calculate_current_streak(), 0) INTO current_streak_val;
  SELECT COALESCE(calculate_longest_streak(), 0) INTO longest_streak_val;

  -- Recent 4 weeks stats
  WITH recent_workouts AS (
    SELECT
      w.id,
      w.datetime,
      CASE
        WHEN MAX(l.datetime) IS NOT NULL AND MIN(l.datetime) IS NOT NULL
        THEN EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/60.0
        ELSE 0
      END as duration_minutes
    FROM workouts w
    LEFT JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '4 weeks'
    GROUP BY w.id, w.datetime
  )
  SELECT
    (COUNT(DISTINCT id)::NUMERIC / 4.0)::NUMERIC,
    (COALESCE(SUM(duration_minutes), 0) / 60.0 / 4.0)::NUMERIC,
    COALESCE(AVG(duration_minutes), 0)::NUMERIC
  INTO
    recent_workouts_per_week,
    recent_hours_per_week,
    recent_avg_duration
  FROM recent_workouts;

  -- Calculate volume and distance from logs (recent 4 weeks)
  SELECT
    COALESCE(SUM(l.weight * l.repetitions) FILTER (WHERE l.weight IS NOT NULL AND l.repetitions IS NOT NULL), 0)::NUMERIC,
    COALESCE(SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL), 0)::NUMERIC
  INTO
    recent_total_volume,
    recent_total_distance
  FROM workouts w
  LEFT JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND w.datetime >= NOW() - INTERVAL '4 weeks';

  -- Previous 4 weeks stats (4-8 weeks ago)
  WITH prev_workouts AS (
    SELECT
      w.id,
      w.datetime,
      CASE
        WHEN MAX(l.datetime) IS NOT NULL AND MIN(l.datetime) IS NOT NULL
        THEN EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/60.0
        ELSE 0
      END as duration_minutes
    FROM workouts w
    LEFT JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '8 weeks'
      AND w.datetime < NOW() - INTERVAL '4 weeks'
    GROUP BY w.id, w.datetime
  )
  SELECT
    (COUNT(DISTINCT id)::NUMERIC / 4.0)::NUMERIC,
    (COALESCE(SUM(duration_minutes), 0) / 60.0 / 4.0)::NUMERIC,
    COALESCE(AVG(duration_minutes), 0)::NUMERIC
  INTO
    prev_workouts_per_week,
    prev_hours_per_week,
    prev_avg_duration
  FROM prev_workouts;

  -- Calculate volume and distance from logs (previous 4 weeks)
  SELECT
    COALESCE(SUM(l.weight * l.repetitions) FILTER (WHERE l.weight IS NOT NULL AND l.repetitions IS NOT NULL), 0)::NUMERIC,
    COALESCE(SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL), 0)::NUMERIC
  INTO
    prev_total_volume,
    prev_total_distance
  FROM workouts w
  LEFT JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND w.datetime >= NOW() - INTERVAL '8 weeks'
    AND w.datetime < NOW() - INTERVAL '4 weeks';

  -- Build result
  result := jsonb_build_object(
    -- All-time
    'total_workouts', COALESCE(total_workouts_count, 0),
    'total_hours', ROUND(COALESCE(total_hours_count, 0), 1),
    'current_streak_days', COALESCE(current_streak_val, 0),
    'longest_streak_days', COALESCE(longest_streak_val, 0),

    -- Recent (last 4 weeks)
    'recent_workouts_per_week', ROUND(COALESCE(recent_workouts_per_week, 0), 1),
    'recent_hours_per_week', ROUND(COALESCE(recent_hours_per_week, 0), 1),
    'recent_avg_duration_minutes', ROUND(COALESCE(recent_avg_duration, 0), 0),
    'recent_total_volume', ROUND(COALESCE(recent_total_volume, 0), 0),
    'recent_total_distance', ROUND(COALESCE(recent_total_distance, 0), 1),

    -- Previous 4 weeks (for trends)
    'prev_workouts_per_week', ROUND(COALESCE(prev_workouts_per_week, 0), 1),
    'prev_hours_per_week', ROUND(COALESCE(prev_hours_per_week, 0), 1),
    'prev_avg_duration_minutes', ROUND(COALESCE(prev_avg_duration, 0), 0),
    'prev_total_volume', ROUND(COALESCE(prev_total_volume, 0), 0),
    'prev_total_distance', ROUND(COALESCE(prev_total_distance, 0), 1)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_stats() TO authenticated;

COMMENT ON FUNCTION public.get_user_profile_stats IS
  'Returns profile stats with all-time metrics and recent 4-week trends';

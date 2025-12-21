-- Redesign profile stats with Recent section (4 week trends)

DROP FUNCTION IF EXISTS public.get_user_profile_stats(integer, text);

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
      EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/3600 as duration_hours
    FROM workouts w
    LEFT JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
    GROUP BY w.id, w.datetime
  )
  SELECT
    COUNT(DISTINCT id),
    COALESCE(SUM(duration_hours), 0)
  INTO
    total_workouts_count,
    total_hours_count
  FROM workout_durations;

  -- Calculate streaks
  SELECT calculate_current_streak() INTO current_streak_val;
  SELECT calculate_longest_streak() INTO longest_streak_val;

  -- Recent 4 weeks stats
  WITH recent_workouts AS (
    SELECT
      w.id,
      w.datetime,
      EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/60 as duration_minutes
    FROM workouts w
    LEFT JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '4 weeks'
    GROUP BY w.id, w.datetime
  ),
  recent_logs AS (
    SELECT
      l.weight,
      l.repetitions,
      l.distance
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '4 weeks'
  )
  SELECT
    COUNT(DISTINCT rw.id)::NUMERIC / 4,  -- workouts per week
    COALESCE(SUM(rw.duration_minutes) / 60, 0) / 4,  -- hours per week
    COALESCE(AVG(rw.duration_minutes), 0),  -- avg duration in minutes
    COALESCE(SUM(rl.weight * rl.repetitions) FILTER (WHERE rl.weight IS NOT NULL AND rl.repetitions IS NOT NULL), 0),
    COALESCE(SUM(rl.distance) FILTER (WHERE rl.distance IS NOT NULL), 0)
  INTO
    recent_workouts_per_week,
    recent_hours_per_week,
    recent_avg_duration,
    recent_total_volume,
    recent_total_distance
  FROM recent_workouts rw
  CROSS JOIN recent_logs rl;

  -- Previous 4 weeks stats (4-8 weeks ago)
  WITH prev_workouts AS (
    SELECT
      w.id,
      w.datetime,
      EXTRACT(EPOCH FROM (MAX(l.datetime) - MIN(l.datetime)))/60 as duration_minutes
    FROM workouts w
    LEFT JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '8 weeks'
      AND w.datetime < NOW() - INTERVAL '4 weeks'
    GROUP BY w.id, w.datetime
  ),
  prev_logs AS (
    SELECT
      l.weight,
      l.repetitions,
      l.distance
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '8 weeks'
      AND w.datetime < NOW() - INTERVAL '4 weeks'
  )
  SELECT
    COUNT(DISTINCT pw.id)::NUMERIC / 4,
    COALESCE(SUM(pw.duration_minutes) / 60, 0) / 4,
    COALESCE(AVG(pw.duration_minutes), 0),
    COALESCE(SUM(pl.weight * pl.repetitions) FILTER (WHERE pl.weight IS NOT NULL AND pl.repetitions IS NOT NULL), 0),
    COALESCE(SUM(pl.distance) FILTER (WHERE pl.distance IS NOT NULL), 0)
  INTO
    prev_workouts_per_week,
    prev_hours_per_week,
    prev_avg_duration,
    prev_total_volume,
    prev_total_distance
  FROM prev_workouts pw
  CROSS JOIN prev_logs pl;

  -- Build result
  result := jsonb_build_object(
    -- All-time
    'total_workouts', total_workouts_count,
    'total_hours', ROUND(total_hours_count, 1),
    'current_streak_days', current_streak_val,
    'longest_streak_days', longest_streak_val,

    -- Recent (last 4 weeks)
    'recent_workouts_per_week', ROUND(recent_workouts_per_week, 1),
    'recent_hours_per_week', ROUND(recent_hours_per_week, 1),
    'recent_avg_duration_minutes', ROUND(recent_avg_duration, 0),
    'recent_total_volume', ROUND(recent_total_volume, 0),
    'recent_total_distance', ROUND(recent_total_distance, 1),

    -- Previous 4 weeks (for trends)
    'prev_workouts_per_week', ROUND(prev_workouts_per_week, 1),
    'prev_hours_per_week', ROUND(prev_hours_per_week, 1),
    'prev_avg_duration_minutes', ROUND(prev_avg_duration, 0),
    'prev_total_volume', ROUND(prev_total_volume, 0),
    'prev_total_distance', ROUND(prev_total_distance, 1)
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_stats() TO authenticated;

COMMENT ON FUNCTION public.get_user_profile_stats IS
  'Returns profile stats with all-time metrics and recent 4-week trends';

-- Fix timezone handling in profile stats
-- Update get_user_profile_stats to accept timezone parameter

DROP FUNCTION IF EXISTS get_user_profile_stats(uuid, integer);

CREATE OR REPLACE FUNCTION get_user_profile_stats(
  p_user_id uuid,
  p_days_back integer DEFAULT 90,
  p_timezone text DEFAULT 'UTC'
)
RETURNS jsonb AS $$
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
    LEFT JOIN exercises e ON e.workout_id = w.id
    LEFT JOIN logs l ON l.exercise_id = e.id
    WHERE w.user_id = p_user_id
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
  SELECT calculate_current_streak(p_user_id) INTO current_streak_val;
  SELECT calculate_longest_streak(p_user_id) INTO longest_streak_val;

  -- Calculate average workouts per week (last 12 weeks)
  SELECT
    (COUNT(DISTINCT w.id)::numeric / 12)
  INTO avg_workouts_per_week
  FROM workouts w
  WHERE w.user_id = p_user_id
    AND w.datetime >= NOW() - INTERVAL '12 weeks';

  -- Find most common workout day (converted to user's timezone)
  SELECT
    TO_CHAR(w.datetime AT TIME ZONE p_timezone, 'Day')
  INTO most_common_day
  FROM workouts w
  WHERE w.user_id = p_user_id
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
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_profile_stats(uuid, integer, text) TO authenticated;

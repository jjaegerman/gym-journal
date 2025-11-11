-- Profile Statistics Functions
-- Works with schema: workouts -> exercises -> logs

-- Calculate current workout streak in days
CREATE OR REPLACE FUNCTION calculate_current_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  current_streak integer := 0;
  check_date date := CURRENT_DATE;
  has_workout boolean;
BEGIN
  LOOP
    -- Check if user worked out on this date
    SELECT EXISTS(
      SELECT 1 FROM workouts
      WHERE user_id = p_user_id
        AND DATE(datetime) = check_date
    ) INTO has_workout;

    IF has_workout THEN
      current_streak := current_streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      -- Allow 1 day grace (today might not have workout yet)
      IF check_date = CURRENT_DATE THEN
        check_date := check_date - INTERVAL '1 day';
        CONTINUE;
      END IF;
      EXIT;
    END IF;
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate longest workout streak
CREATE OR REPLACE FUNCTION calculate_longest_streak(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  max_streak integer := 0;
  current_streak integer := 0;
  prev_date date;
  workout_date date;
BEGIN
  FOR workout_date IN
    SELECT DISTINCT DATE(datetime) as workout_date
    FROM workouts
    WHERE user_id = p_user_id
    ORDER BY workout_date ASC
  LOOP
    IF prev_date IS NULL OR workout_date = prev_date + INTERVAL '1 day' THEN
      current_streak := current_streak + 1;
      max_streak := GREATEST(max_streak, current_streak);
    ELSE
      current_streak := 1;
    END IF;
    prev_date := workout_date;
  END LOOP;

  RETURN max_streak;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get per-exercise statistics
CREATE OR REPLACE FUNCTION get_exercise_stats(
  p_user_id uuid,
  p_days_back integer DEFAULT 90
)
RETURNS TABLE(
  exercise_name text,
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
    e.name as exercise_name,
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
  GROUP BY e.name
  ORDER BY COUNT(DISTINCT w.id) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get user profile statistics
CREATE OR REPLACE FUNCTION get_user_profile_stats(
  p_user_id uuid,
  p_days_back integer DEFAULT 90
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

  -- Find most common workout day
  SELECT
    TO_CHAR(w.datetime, 'Day')
  INTO most_common_day
  FROM workouts w
  WHERE w.user_id = p_user_id
  GROUP BY TO_CHAR(w.datetime, 'Day'), EXTRACT(DOW FROM w.datetime)
  ORDER BY COUNT(*) DESC, EXTRACT(DOW FROM w.datetime)
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
GRANT EXECUTE ON FUNCTION calculate_current_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_longest_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exercise_stats(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_stats(uuid, integer) TO authenticated;

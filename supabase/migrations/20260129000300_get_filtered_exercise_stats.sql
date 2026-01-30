-- RPC to return filtered exercise stats with progress data and PRs

CREATE OR REPLACE FUNCTION get_filtered_exercise_stats(
  p_categories text[] DEFAULT NULL,
  p_modifiers jsonb DEFAULT NULL,
  p_equipment text[] DEFAULT NULL,
  p_time_range text DEFAULT 'all_time'
)
RETURNS TABLE(
  matched_exercises bigint,
  display_name text,
  total_workouts bigint,
  total_sets bigint,
  total_volume numeric,
  total_distance numeric,
  max_weight numeric,
  max_reps integer,
  weight_pr jsonb,
  reps_pr jsonb,
  progress_data jsonb,
  recent_sessions jsonb,
  first_logged timestamptz,
  last_logged timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time_filter timestamptz;
  v_default_category text;
  v_default_equipment text;
  v_has_filters boolean;
BEGIN
  -- Calculate time filter
  v_time_filter := CASE p_time_range
    WHEN '1_month' THEN now() - interval '1 month'
    WHEN '3_months' THEN now() - interval '3 months'
    WHEN '1_year' THEN now() - interval '1 year'
    ELSE NULL -- all_time
  END;

  -- Check if filters are provided
  v_has_filters := (p_categories IS NOT NULL AND array_length(p_categories, 1) > 0)
                OR (p_modifiers IS NOT NULL AND jsonb_array_length(p_modifiers) > 0)
                OR (p_equipment IS NOT NULL AND array_length(p_equipment, 1) > 0);

  -- If no filters, get most recently logged exercise
  IF NOT v_has_filters THEN
    SELECT l.category, l.equipment
    INTO v_default_category, v_default_equipment
    FROM logs l
    INNER JOIN workouts w ON l.workout_id = w.id
    WHERE w.user_id = auth.uid() AND l.category IS NOT NULL
    ORDER BY l.datetime DESC
    LIMIT 1;

    IF v_default_category IS NOT NULL THEN
      p_categories := ARRAY[v_default_category];
      IF v_default_equipment IS NOT NULL THEN
        p_equipment := ARRAY[v_default_equipment];
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  WITH filtered_logs AS (
    SELECT
      l.id,
      l.workout_id,
      l.category,
      l.modifiers,
      l.equipment,
      l.weight,
      l.repetitions,
      l.distance,
      l.datetime,
      w.datetime as workout_datetime
    FROM logs l
    INNER JOIN workouts w ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND (p_categories IS NULL OR l.category = ANY(p_categories))
      AND (p_equipment IS NULL OR l.equipment = ANY(p_equipment))
      AND (p_modifiers IS NULL OR l.modifiers @> p_modifiers)
      AND (v_time_filter IS NULL OR l.datetime >= v_time_filter)
  ),
  exercise_groups AS (
    SELECT DISTINCT category, equipment
    FROM filtered_logs
    WHERE category IS NOT NULL
  ),
  aggregates AS (
    SELECT
      COUNT(DISTINCT fl.workout_id) as total_workouts,
      COUNT(*) as total_sets,
      COALESCE(SUM(COALESCE(fl.weight, 0) * COALESCE(fl.repetitions, 0)), 0) as total_volume,
      COALESCE(SUM(fl.distance), 0) as total_distance,
      MAX(fl.weight) as max_weight,
      MAX(fl.repetitions)::integer as max_reps,
      MIN(fl.datetime) as first_logged,
      MAX(fl.datetime) as last_logged
    FROM filtered_logs fl
  ),
  weight_pr AS (
    SELECT jsonb_build_object(
      'value', fl.weight,
      'date', fl.datetime,
      'exercise', fl.category || COALESCE(' (' || fl.equipment || ')', '')
    ) as pr
    FROM filtered_logs fl
    WHERE fl.weight IS NOT NULL
    ORDER BY fl.weight DESC, fl.datetime ASC
    LIMIT 1
  ),
  reps_pr AS (
    SELECT jsonb_build_object(
      'value', fl.repetitions,
      'date', fl.datetime,
      'exercise', fl.category || COALESCE(' (' || fl.equipment || ')', '')
    ) as pr
    FROM filtered_logs fl
    WHERE fl.repetitions IS NOT NULL
    ORDER BY fl.repetitions DESC, fl.datetime ASC
    LIMIT 1
  ),
  weekly_progress AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'week', week_start,
        'volume', week_volume,
        'maxWeight', week_max_weight
      )
      ORDER BY week_start
    ) as data
    FROM (
      SELECT
        date_trunc('week', fl.datetime)::date as week_start,
        SUM(COALESCE(fl.weight, 0) * COALESCE(fl.repetitions, 0)) as week_volume,
        MAX(fl.weight) as week_max_weight
      FROM filtered_logs fl
      GROUP BY date_trunc('week', fl.datetime)
      ORDER BY week_start
      LIMIT 52 -- Last year of weeks max
    ) weeks
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'workoutId', workout_id,
        'date', workout_date,
        'summary', summary
      )
      ORDER BY workout_date DESC
    ) as sessions
    FROM (
      SELECT DISTINCT ON (fl.workout_id)
        fl.workout_id,
        fl.workout_datetime as workout_date,
        (
          SELECT COUNT(*) || 'x' ||
            COALESCE(MAX(l2.repetitions)::text, '?') ||
            CASE WHEN MAX(l2.weight) IS NOT NULL
              THEN ' @ ' || MAX(l2.weight)::text || ' lbs'
              ELSE ''
            END
          FROM filtered_logs l2
          WHERE l2.workout_id = fl.workout_id
        ) as summary
      FROM filtered_logs fl
      ORDER BY fl.workout_id, fl.datetime DESC
      LIMIT 5
    ) recent_workouts
  ),
  display AS (
    SELECT
      CASE
        WHEN (SELECT COUNT(*) FROM exercise_groups) = 1 THEN
          (SELECT eg.category || COALESCE(' (' || eg.equipment || ')', '')
           FROM exercise_groups eg LIMIT 1)
        WHEN (SELECT COUNT(*) FROM exercise_groups) > 1 THEN
          (SELECT COUNT(*)::text || ' exercises' FROM exercise_groups)
        ELSE 'No exercises'
      END as name
  )
  SELECT
    (SELECT COUNT(*) FROM exercise_groups)::bigint,
    (SELECT name FROM display),
    COALESCE(a.total_workouts, 0)::bigint,
    COALESCE(a.total_sets, 0)::bigint,
    COALESCE(a.total_volume, 0)::numeric,
    COALESCE(a.total_distance, 0)::numeric,
    a.max_weight,
    a.max_reps,
    (SELECT pr FROM weight_pr),
    (SELECT pr FROM reps_pr),
    COALESCE((SELECT data FROM weekly_progress), '[]'::jsonb),
    COALESCE((SELECT sessions FROM recent), '[]'::jsonb),
    a.first_logged,
    a.last_logged
  FROM aggregates a;
END;
$$;

GRANT EXECUTE ON FUNCTION get_filtered_exercise_stats(text[], jsonb, text[], text) TO authenticated;

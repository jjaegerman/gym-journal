-- Profile page redesign: three new SECURITY DEFINER RPCs feeding the
-- multi-metric chart, PR timeline, and calendar heatmap.

-- =============================================================
-- 1. get_user_profile_weekly_trends
-- Returns weekly-bucketed workout count, total minutes, total volume.
-- Empty weeks within the range are returned with zeros (no client gap-fill).
-- =============================================================

DROP FUNCTION IF EXISTS public.get_user_profile_weekly_trends(date, date);

CREATE OR REPLACE FUNCTION public.get_user_profile_weekly_trends(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight_unit text;
  v_distance_unit text;
  v_weeks jsonb;
BEGIN
  SELECT
    COALESCE(preferred_weight_unit, 'lbs'),
    COALESCE(preferred_distance_unit, 'miles')
  INTO v_weight_unit, v_distance_unit
  FROM profiles
  WHERE id = auth.uid();

  IF v_weight_unit IS NULL THEN v_weight_unit := 'lbs'; END IF;
  IF v_distance_unit IS NULL THEN v_distance_unit := 'miles'; END IF;

  WITH workout_durations AS (
    SELECT
      w.id,
      w.user_id,
      date_trunc('week', w.datetime)::date AS week_start,
      GREATEST(0, EXTRACT(EPOCH FROM (MAX(s.datetime) - MIN(s.datetime))) / 60.0) AS duration_minutes
    FROM workouts w
    LEFT JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= p_start_date
      AND w.datetime < (p_end_date + INTERVAL '1 day')
    GROUP BY w.id, w.user_id, w.datetime
  ),
  workout_volume AS (
    SELECT
      w.id AS workout_id,
      date_trunc('week', w.datetime)::date AS week_start,
      SUM(
        CASE
          WHEN s.weight IS NULL OR s.repetitions IS NULL THEN 0
          WHEN s.weight_unit = v_weight_unit THEN s.weight * s.repetitions
          WHEN s.weight_unit = 'kg' AND v_weight_unit = 'lbs' THEN s.weight * s.repetitions * 2.20462
          WHEN s.weight_unit = 'lbs' AND v_weight_unit = 'kg' THEN s.weight * s.repetitions / 2.20462
          ELSE s.weight * s.repetitions
        END
      ) AS volume
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= p_start_date
      AND w.datetime < (p_end_date + INTERVAL '1 day')
    GROUP BY w.id, w.datetime
  ),
  week_spine AS (
    SELECT generate_series(
      date_trunc('week', p_start_date)::date,
      date_trunc('week', p_end_date)::date,
      INTERVAL '1 week'
    )::date AS week_start
  ),
  weekly AS (
    SELECT
      ws.week_start,
      COUNT(DISTINCT wd.id) AS workout_count,
      COALESCE(SUM(wd.duration_minutes), 0)::numeric AS total_minutes,
      COALESCE(SUM(wv.volume), 0)::numeric AS total_volume
    FROM week_spine ws
    LEFT JOIN workout_durations wd ON wd.week_start = ws.week_start
    LEFT JOIN workout_volume wv ON wv.workout_id = wd.id
    GROUP BY ws.week_start
    ORDER BY ws.week_start
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'week_start', week_start,
      'workout_count', workout_count,
      'total_minutes', ROUND(total_minutes, 1),
      'total_volume', ROUND(total_volume, 1)
    )
  )
  INTO v_weeks
  FROM weekly;

  RETURN jsonb_build_object(
    'weight_unit', v_weight_unit,
    'distance_unit', v_distance_unit,
    'weeks', COALESCE(v_weeks, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile_weekly_trends(date, date) TO authenticated;

-- =============================================================
-- 2. get_daily_training_summary
-- Returns one row per day in [p_start_date, p_end_date] with workout_count
-- and total_minutes (0 for empty days). Used by the calendar heatmap.
-- =============================================================

DROP FUNCTION IF EXISTS public.get_daily_training_summary(date, date);

CREATE OR REPLACE FUNCTION public.get_daily_training_summary(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  day date,
  workout_count int,
  total_minutes int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH day_spine AS (
    SELECT generate_series(p_start_date, p_end_date, INTERVAL '1 day')::date AS day
  ),
  workout_minutes AS (
    SELECT
      w.id,
      w.datetime::date AS day,
      GREATEST(0, EXTRACT(EPOCH FROM (MAX(s.datetime) - MIN(s.datetime))) / 60.0) AS minutes
    FROM workouts w
    LEFT JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= p_start_date
      AND w.datetime < (p_end_date + INTERVAL '1 day')
    GROUP BY w.id, w.datetime
  )
  SELECT
    ds.day,
    COALESCE(COUNT(DISTINCT wm.id), 0)::int AS workout_count,
    COALESCE(ROUND(SUM(wm.minutes))::int, 0) AS total_minutes
  FROM day_spine ds
  LEFT JOIN workout_minutes wm ON wm.day = ds.day
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_training_summary(date, date) TO authenticated;

-- =============================================================
-- 3. get_user_pr_timeline
-- Returns the user's most recent PRs in a time range. PR types:
--   weight, reps_at_top, distance, pace, duration
-- PR group key = (exercise_kind, sorted modifiers[], equipment).
-- A PR requires a prior baseline in the group.
-- =============================================================

DROP FUNCTION IF EXISTS public.get_user_pr_timeline(text, int, text, text);

CREATE OR REPLACE FUNCTION public.get_user_pr_timeline(
  p_time_range text DEFAULT '1_month',
  p_limit int DEFAULT 8,
  p_preferred_weight_unit text DEFAULT 'lbs',
  p_preferred_distance_unit text DEFAULT 'miles'
)
RETURNS TABLE(
  pr_type text,
  exercise_kind text,
  modifiers jsonb,
  equipment text,
  display_name text,
  value numeric,
  unit text,
  previous_value numeric,
  delta numeric,
  achieved_at timestamptz,
  workout_id uuid,
  set_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamptz;
BEGIN
  v_start_date := CASE p_time_range
    WHEN '1_month'   THEN NOW() - INTERVAL '1 month'
    WHEN '3_months'  THEN NOW() - INTERVAL '3 months'
    WHEN '1_year'    THEN NOW() - INTERVAL '1 year'
    WHEN 'all_time'  THEN '1970-01-01'::timestamptz
    ELSE NOW() - INTERVAL '1 month'
  END;

  RETURN QUERY
  WITH
  normalized AS (
    SELECT
      s.id AS set_id_,
      s.workout_id AS workout_id_,
      s.datetime,
      s.exercise_kind AS exercise_kind_,
      COALESCE(s.equipment, '') AS equipment_,
      COALESCE(
        (SELECT jsonb_agg(m ORDER BY m) FROM jsonb_array_elements_text(s.modifiers) m),
        '[]'::jsonb
      ) AS modifiers_sorted,
      CASE
        WHEN s.weight IS NULL THEN NULL
        WHEN s.weight_unit = p_preferred_weight_unit THEN s.weight
        WHEN s.weight_unit = 'kg' AND p_preferred_weight_unit = 'lbs' THEN s.weight * 2.20462
        WHEN s.weight_unit = 'lbs' AND p_preferred_weight_unit = 'kg' THEN s.weight / 2.20462
        ELSE s.weight
      END AS weight_pref,
      s.repetitions,
      CASE
        WHEN s.distance IS NULL THEN NULL
        WHEN s.distance_unit = p_preferred_distance_unit THEN s.distance
        WHEN s.distance_unit = 'km' AND p_preferred_distance_unit = 'miles' THEN s.distance * 0.621371
        WHEN s.distance_unit = 'miles' AND p_preferred_distance_unit = 'km' THEN s.distance / 0.621371
        ELSE s.distance
      END AS distance_pref,
      CASE
        WHEN s.duration IS NULL THEN NULL
        ELSE parse_iso8601_duration_to_seconds(s.duration)
      END AS duration_seconds
    FROM sets s
    JOIN workouts w ON w.id = s.workout_id
    WHERE w.user_id = auth.uid()
  ),
  grouped AS (
    SELECT
      n.*,
      jsonb_build_array(n.exercise_kind_, n.modifiers_sorted, n.equipment_) AS group_key
    FROM normalized n
  ),
  with_running_maxes AS (
    SELECT
      g.*,
      MAX(g.weight_pref) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_weight,
      MAX(g.distance_pref) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_distance,
      MAX(g.duration_seconds) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_duration,
      MIN(
        CASE
          WHEN g.duration_seconds IS NOT NULL AND g.distance_pref IS NOT NULL AND g.distance_pref > 0
          THEN g.duration_seconds / g.distance_pref
          ELSE NULL
        END
      ) OVER (
        PARTITION BY g.group_key
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_best_pace,
      MAX(g.repetitions) OVER (
        PARTITION BY g.group_key, g.weight_pref
        ORDER BY g.datetime
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prev_max_reps_at_weight,
      NULL::int AS unused_marker
    FROM grouped g
  ),
  prs AS (
    SELECT
      'weight'::text AS pr_type,
      r.exercise_kind_ AS exercise_kind,
      r.modifiers_sorted AS modifiers,
      NULLIF(r.equipment_, '') AS equipment,
      r.weight_pref AS value,
      p_preferred_weight_unit AS unit,
      r.prev_max_weight AS previous_value,
      (r.weight_pref - r.prev_max_weight) AS delta,
      r.datetime AS achieved_at,
      r.workout_id_ AS workout_id,
      r.set_id_ AS set_id
    FROM with_running_maxes r
    WHERE r.weight_pref IS NOT NULL
      AND r.prev_max_weight IS NOT NULL
      AND r.weight_pref > r.prev_max_weight
      AND r.datetime >= v_start_date

    UNION ALL

    SELECT
      'reps_at_top'::text,
      r.exercise_kind_, r.modifiers_sorted, NULLIF(r.equipment_, ''),
      r.repetitions::numeric,
      'reps'::text,
      r.prev_max_reps_at_weight::numeric,
      (r.repetitions - r.prev_max_reps_at_weight)::numeric,
      r.datetime,
      r.workout_id_,
      r.set_id_
    FROM with_running_maxes r
    WHERE r.repetitions IS NOT NULL
      AND r.weight_pref IS NOT NULL
      AND r.prev_max_reps_at_weight IS NOT NULL
      AND r.repetitions > r.prev_max_reps_at_weight
      AND r.datetime >= v_start_date

    UNION ALL

    SELECT
      'distance'::text,
      r.exercise_kind_, r.modifiers_sorted, NULLIF(r.equipment_, ''),
      r.distance_pref,
      p_preferred_distance_unit,
      r.prev_max_distance,
      (r.distance_pref - r.prev_max_distance),
      r.datetime,
      r.workout_id_,
      r.set_id_
    FROM with_running_maxes r
    WHERE r.distance_pref IS NOT NULL
      AND r.prev_max_distance IS NOT NULL
      AND r.distance_pref > r.prev_max_distance
      AND r.datetime >= v_start_date

    UNION ALL

    SELECT
      'pace'::text,
      r.exercise_kind_, r.modifiers_sorted, NULLIF(r.equipment_, ''),
      (r.duration_seconds / r.distance_pref)::numeric,
      ('s_per_' || p_preferred_distance_unit),
      r.prev_best_pace,
      ((r.duration_seconds / r.distance_pref) - r.prev_best_pace)::numeric,
      r.datetime,
      r.workout_id_,
      r.set_id_
    FROM with_running_maxes r
    WHERE r.duration_seconds IS NOT NULL
      AND r.distance_pref IS NOT NULL
      AND r.distance_pref > 0
      AND r.prev_best_pace IS NOT NULL
      AND (r.duration_seconds / r.distance_pref) < r.prev_best_pace
      AND r.datetime >= v_start_date

    UNION ALL

    SELECT
      'duration'::text,
      r.exercise_kind_, r.modifiers_sorted, NULLIF(r.equipment_, ''),
      r.duration_seconds::numeric,
      's'::text,
      r.prev_max_duration,
      (r.duration_seconds - r.prev_max_duration)::numeric,
      r.datetime,
      r.workout_id_,
      r.set_id_
    FROM with_running_maxes r
    WHERE r.duration_seconds IS NOT NULL
      AND r.distance_pref IS NULL
      AND r.prev_max_duration IS NOT NULL
      AND r.duration_seconds > r.prev_max_duration
      AND r.datetime >= v_start_date
  )
  SELECT
    p.pr_type,
    p.exercise_kind,
    p.modifiers,
    p.equipment,
    TRIM(
      COALESCE(
        (SELECT string_agg(m, ' ') FROM jsonb_array_elements_text(p.modifiers) m),
        ''
      ) || ' ' || p.exercise_kind ||
      CASE WHEN p.equipment IS NOT NULL AND p.equipment <> ''
        THEN ' (' || p.equipment || ')'
        ELSE ''
      END
    ) AS display_name,
    p.value,
    p.unit,
    p.previous_value,
    p.delta,
    p.achieved_at,
    p.workout_id,
    p.set_id
  FROM prs p
  ORDER BY p.achieved_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_pr_timeline(text, int, text, text) TO authenticated;

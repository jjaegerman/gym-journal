-- Improve recent_sessions summary to handle all exercise types
-- Previously only showed reps/weight (e.g. "1x?" for running).
-- Now matches the frontend descriptionFromSummary format:
--   "3 sets • 8 - 10 reps • 135 lbs"
--   "1 set • 3.1 miles • 30 min"

DROP FUNCTION IF EXISTS get_filtered_exercise_stats(text[], jsonb, text[], text, text, text);

CREATE FUNCTION get_filtered_exercise_stats(
  p_exercise_kinds           text[]  DEFAULT NULL,
  p_modifiers                jsonb   DEFAULT NULL,
  p_equipment                text[]  DEFAULT NULL,
  p_time_range               text    DEFAULT 'all_time',
  p_preferred_weight_unit    text    DEFAULT 'lbs',
  p_preferred_distance_unit  text    DEFAULT 'miles'
)
RETURNS TABLE(
  matched_exercises       bigint,
  display_name            text,
  total_workouts          bigint,
  total_sets              bigint,
  total_volume            numeric,
  total_distance          numeric,
  max_weight              numeric,
  max_reps                integer,
  total_duration_seconds  numeric,
  max_duration_seconds    numeric,
  best_pace               numeric,
  max_resistance_level    integer,
  weight_unit             text,
  distance_unit           text,
  weight_pr               jsonb,
  reps_pr                 jsonb,
  progress_data           jsonb,
  recent_sessions         jsonb,
  first_logged            timestamptz,
  last_logged             timestamptz,
  applied_filters         jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time_filter             timestamptz;
  v_default_exercise_kind   text;
  v_default_equipment       text;
  v_has_filters             boolean;
  v_applied_exercise_kinds  text[];
  v_applied_equipment       text[];
BEGIN
  v_time_filter := CASE p_time_range
    WHEN '1_month'  THEN now() - interval '1 month'
    WHEN '3_months' THEN now() - interval '3 months'
    WHEN '1_year'   THEN now() - interval '1 year'
    ELSE NULL
  END;

  v_has_filters := (p_exercise_kinds IS NOT NULL AND array_length(p_exercise_kinds, 1) > 0)
                OR (p_modifiers IS NOT NULL AND jsonb_array_length(p_modifiers) > 0)
                OR (p_equipment IS NOT NULL AND array_length(p_equipment, 1) > 0);

  v_applied_exercise_kinds := p_exercise_kinds;
  v_applied_equipment      := p_equipment;

  IF NOT v_has_filters THEN
    SELECT s.exercise_kind, s.equipment
    INTO v_default_exercise_kind, v_default_equipment
    FROM sets s
    INNER JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = auth.uid() AND s.exercise_kind IS NOT NULL
    ORDER BY s.datetime DESC
    LIMIT 1;

    IF v_default_exercise_kind IS NOT NULL THEN
      p_exercise_kinds         := ARRAY[v_default_exercise_kind];
      v_applied_exercise_kinds := p_exercise_kinds;
      IF v_default_equipment IS NOT NULL THEN
        p_equipment         := ARRAY[v_default_equipment];
        v_applied_equipment := p_equipment;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  WITH filtered_sets AS (
    SELECT
      s.id,
      s.workout_id,
      s.exercise_kind,
      s.modifiers,
      s.equipment,
      s.weight * CASE
        WHEN s.weight_unit = p_preferred_weight_unit                    THEN 1
        WHEN s.weight_unit = 'lbs' AND p_preferred_weight_unit = 'kg'  THEN 0.453592
        WHEN s.weight_unit = 'kg'  AND p_preferred_weight_unit = 'lbs' THEN 2.20462
        ELSE 1
      END AS weight,
      s.distance * CASE
        WHEN s.distance_unit = p_preferred_distance_unit                          THEN 1
        WHEN s.distance_unit = 'miles'  AND p_preferred_distance_unit = 'km'     THEN 1.60934
        WHEN s.distance_unit = 'km'     AND p_preferred_distance_unit = 'miles'  THEN 0.621371
        WHEN s.distance_unit = 'meters' AND p_preferred_distance_unit = 'miles'  THEN 0.000621371
        WHEN s.distance_unit = 'meters' AND p_preferred_distance_unit = 'km'     THEN 0.001
        ELSE 1
      END AS distance,
      s.repetitions,
      s.duration,
      s.resistance_level,
      s.datetime,
      w.datetime AS workout_datetime
    FROM sets s
    INNER JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND (p_exercise_kinds IS NULL OR s.exercise_kind = ANY(p_exercise_kinds))
      AND (p_equipment IS NULL OR s.equipment = ANY(p_equipment))
      AND (p_modifiers IS NULL OR s.modifiers @> p_modifiers)
      AND (v_time_filter IS NULL OR s.datetime >= v_time_filter)
  ),
  exercise_groups AS (
    SELECT DISTINCT exercise_kind, equipment
    FROM filtered_sets
    WHERE exercise_kind IS NOT NULL
  ),
  aggregates AS (
    SELECT
      COUNT(DISTINCT fs.workout_id)                                              AS total_workouts,
      COUNT(*)                                                                   AS total_sets,
      COALESCE(SUM(COALESCE(fs.weight, 0) * COALESCE(fs.repetitions, 0)), 0)   AS total_volume,
      COALESCE(SUM(fs.distance), 0)                                             AS total_distance,
      MAX(fs.weight)                                                             AS max_weight,
      MAX(fs.repetitions)::integer                                               AS max_reps,
      COALESCE(SUM(
        CASE WHEN fs.duration IS NOT NULL
          THEN parse_iso8601_duration_to_seconds(fs.duration) ELSE 0 END
      ), 0)                                                                      AS total_duration_seconds,
      MAX(CASE WHEN fs.duration IS NOT NULL
          THEN parse_iso8601_duration_to_seconds(fs.duration) END)              AS max_duration_seconds,
      MIN(CASE WHEN fs.duration IS NOT NULL
               AND fs.distance IS NOT NULL AND fs.distance > 0
          THEN parse_iso8601_duration_to_seconds(fs.duration) / 60.0 / fs.distance
          END)                                                                   AS best_pace,
      MAX(fs.resistance_level)::integer                                          AS max_resistance_level,
      MIN(fs.datetime)                                                           AS first_logged,
      MAX(fs.datetime)                                                           AS last_logged
    FROM filtered_sets fs
  ),
  weight_pr AS (
    SELECT jsonb_build_object(
      'value',    fs.weight,
      'date',     fs.datetime,
      'exercise', fs.exercise_kind || COALESCE(' (' || fs.equipment || ')', '')
    ) AS pr
    FROM filtered_sets fs
    WHERE fs.weight IS NOT NULL
    ORDER BY fs.weight DESC, fs.datetime ASC
    LIMIT 1
  ),
  reps_pr AS (
    SELECT jsonb_build_object(
      'value',    fs.repetitions,
      'date',     fs.datetime,
      'exercise', fs.exercise_kind || COALESCE(' (' || fs.equipment || ')', '')
    ) AS pr
    FROM filtered_sets fs
    WHERE fs.repetitions IS NOT NULL
    ORDER BY fs.repetitions DESC, fs.datetime ASC
    LIMIT 1
  ),
  weekly_progress AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'week',        week_start,
        'volume',      week_volume,
        'maxWeight',   week_max_weight,
        'maxReps',     week_max_reps,
        'distance',    week_distance,
        'avgPace',     week_avg_pace,
        'maxDuration', week_max_duration,
        'maxResistance', week_max_resistance
      )
      ORDER BY week_start
    ) AS data
    FROM (
      SELECT
        date_trunc('week', fs.datetime)::date                AS week_start,
        SUM(COALESCE(fs.weight, 0) * COALESCE(fs.repetitions, 0)) AS week_volume,
        MAX(fs.weight)                                       AS week_max_weight,
        MAX(fs.repetitions)                                  AS week_max_reps,
        SUM(fs.distance)                                     AS week_distance,
        AVG(CASE WHEN fs.duration IS NOT NULL
                 AND fs.distance IS NOT NULL AND fs.distance > 0
            THEN parse_iso8601_duration_to_seconds(fs.duration) / 60.0 / fs.distance
            END)                                             AS week_avg_pace,
        MAX(CASE WHEN fs.duration IS NOT NULL
            THEN parse_iso8601_duration_to_seconds(fs.duration) END) AS week_max_duration,
        MAX(fs.resistance_level)                             AS week_max_resistance
      FROM filtered_sets fs
      GROUP BY date_trunc('week', fs.datetime)
      ORDER BY week_start
      LIMIT 52
    ) weeks
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'workoutId', workout_id,
        'date',      workout_date,
        'summary',   summary
      )
      ORDER BY workout_date DESC
    ) AS sessions
    FROM (
      SELECT DISTINCT ON (fs.workout_id)
        fs.workout_id,
        fs.workout_datetime AS workout_date,
        (
          SELECT
            -- sets count
            agg.set_count || CASE WHEN agg.set_count = '1' THEN ' set' ELSE ' sets' END
            -- reps
            || CASE WHEN agg.min_reps IS NOT NULL THEN
              ' · ' || CASE WHEN agg.min_reps = agg.max_reps
                THEN agg.min_reps::text
                ELSE agg.min_reps || ' - ' || agg.max_reps
              END || CASE WHEN agg.max_reps = '1' THEN ' rep' ELSE ' reps' END
              ELSE ''
            END
            -- weight
            || CASE WHEN agg.min_weight IS NOT NULL THEN
              ' · ' || CASE WHEN agg.min_weight = agg.max_weight
                THEN ROUND(agg.min_weight)::text
                ELSE ROUND(agg.min_weight) || ' - ' || ROUND(agg.max_weight)
              END || ' ' || p_preferred_weight_unit
              ELSE ''
            END
            -- distance
            || CASE WHEN agg.min_dist IS NOT NULL THEN
              ' · ' || CASE WHEN agg.min_dist = agg.max_dist
                THEN ROUND(agg.min_dist::numeric, 1)::text
                ELSE ROUND(agg.min_dist::numeric, 1) || ' - ' || ROUND(agg.max_dist::numeric, 1)
              END || ' ' || p_preferred_distance_unit
              ELSE ''
            END
            -- resistance level
            || CASE WHEN agg.min_res IS NOT NULL THEN
              ' · lvl ' || CASE WHEN agg.min_res = agg.max_res
                THEN agg.min_res::text
                ELSE agg.min_res || ' - ' || agg.max_res
              END
              ELSE ''
            END
            -- duration (formatted as Xh Ymin / Y min)
            || CASE WHEN agg.min_dur_sec IS NOT NULL THEN
              ' · ' || CASE
                WHEN agg.min_dur_sec = agg.max_dur_sec THEN
                  CASE
                    WHEN agg.max_dur_sec >= 3600 AND (agg.max_dur_sec % 3600) = 0
                      THEN (agg.max_dur_sec / 3600) || 'h'
                    WHEN agg.max_dur_sec >= 3600
                      THEN (agg.max_dur_sec / 3600) || 'h ' || ((agg.max_dur_sec % 3600) / 60) || 'min'
                    ELSE (agg.max_dur_sec / 60) || ' min'
                  END
                ELSE
                  CASE
                    WHEN agg.min_dur_sec >= 3600 AND (agg.min_dur_sec % 3600) = 0
                      THEN (agg.min_dur_sec / 3600) || 'h'
                    WHEN agg.min_dur_sec >= 3600
                      THEN (agg.min_dur_sec / 3600) || 'h ' || ((agg.min_dur_sec % 3600) / 60) || 'min'
                    ELSE (agg.min_dur_sec / 60) || ' min'
                  END
                  || ' - '
                  || CASE
                    WHEN agg.max_dur_sec >= 3600 AND (agg.max_dur_sec % 3600) = 0
                      THEN (agg.max_dur_sec / 3600) || 'h'
                    WHEN agg.max_dur_sec >= 3600
                      THEN (agg.max_dur_sec / 3600) || 'h ' || ((agg.max_dur_sec % 3600) / 60) || 'min'
                    ELSE (agg.max_dur_sec / 60) || ' min'
                  END
              END
              ELSE ''
            END
          FROM (
            SELECT
              COUNT(*)::text                                    AS set_count,
              MIN(fs2.repetitions)::text                        AS min_reps,
              MAX(fs2.repetitions)::text                        AS max_reps,
              MIN(fs2.weight)                                   AS min_weight,
              MAX(fs2.weight)                                   AS max_weight,
              MIN(fs2.distance)                                 AS min_dist,
              MAX(fs2.distance)                                 AS max_dist,
              MIN(fs2.resistance_level)::text                   AS min_res,
              MAX(fs2.resistance_level)::text                   AS max_res,
              MIN(CASE WHEN fs2.duration IS NOT NULL
                THEN parse_iso8601_duration_to_seconds(fs2.duration)::integer END) AS min_dur_sec,
              MAX(CASE WHEN fs2.duration IS NOT NULL
                THEN parse_iso8601_duration_to_seconds(fs2.duration)::integer END) AS max_dur_sec
            FROM filtered_sets fs2
            WHERE fs2.workout_id = fs.workout_id
          ) agg
        ) AS summary
      FROM filtered_sets fs
      ORDER BY fs.workout_id, fs.datetime DESC
      LIMIT 5
    ) recent_workouts
  ),
  display AS (
    SELECT
      CASE
        WHEN (SELECT COUNT(*) FROM exercise_groups) = 1 THEN
          (SELECT eg.exercise_kind || COALESCE(' (' || eg.equipment || ')', '')
           FROM exercise_groups eg LIMIT 1)
        WHEN (SELECT COUNT(*) FROM exercise_groups) > 1 THEN
          (SELECT COUNT(*)::text || ' exercises' FROM exercise_groups)
        ELSE 'No exercises'
      END AS name
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
    COALESCE(a.total_duration_seconds, 0)::numeric,
    a.max_duration_seconds,
    a.best_pace,
    a.max_resistance_level,
    p_preferred_weight_unit,
    p_preferred_distance_unit,
    (SELECT pr FROM weight_pr),
    (SELECT pr FROM reps_pr),
    COALESCE((SELECT data FROM weekly_progress), '[]'::jsonb),
    COALESCE((SELECT sessions FROM recent), '[]'::jsonb),
    a.first_logged,
    a.last_logged,
    jsonb_build_object(
      'exercise_kinds', COALESCE(to_jsonb(v_applied_exercise_kinds), '[]'::jsonb),
      'equipment',      COALESCE(to_jsonb(v_applied_equipment), '[]'::jsonb),
      'modifiers',      COALESCE(p_modifiers, '[]'::jsonb),
      'timeRange',      p_time_range
    )
  FROM aggregates a;
END;
$$;

GRANT EXECUTE ON FUNCTION get_filtered_exercise_stats(text[], jsonb, text[], text, text, text) TO authenticated;

-- Rename sets.category → sets.exercise_kind throughout DB
-- Affects: column, indexes, VIEW, and all RPC functions

-- ============================================================
-- 1. Rename column
-- ============================================================
ALTER TABLE sets RENAME COLUMN category TO exercise_kind;

-- ============================================================
-- 2. Update indexes
-- ============================================================
DROP INDEX IF EXISTS sets_exercise_grouping_idx;
CREATE INDEX sets_exercise_grouping_idx ON sets(workout_id, exercise_kind, equipment);

ALTER INDEX IF EXISTS idx_sets_category RENAME TO idx_sets_exercise_kind;

-- ============================================================
-- 3. Recreate workout_exercises VIEW
-- ============================================================
DROP VIEW IF EXISTS workout_exercises;

CREATE VIEW workout_exercises AS
SELECT
  s.workout_id,
  s.exercise_kind,
  COALESCE(s.modifiers, '[]'::jsonb) as modifiers,
  s.equipment,

  COUNT(*) as total_sets,
  MAX(s.weight) as max_weight,
  MAX(s.repetitions) as max_reps,
  AVG(s.weight) FILTER (WHERE s.weight IS NOT NULL) as avg_weight,
  SUM(COALESCE(s.weight, 0) * COALESCE(s.repetitions, 0)) as total_volume,
  SUM(s.distance) FILTER (WHERE s.distance IS NOT NULL) as total_distance,

  MIN(s.datetime) as first_logged,
  MAX(s.datetime) as last_logged,
  MIN(s.datetime) as datetime
FROM sets s
WHERE s.exercise_kind IS NOT NULL
GROUP BY
  s.workout_id,
  s.exercise_kind,
  s.modifiers,
  s.equipment;

GRANT SELECT ON workout_exercises TO authenticated;

-- ============================================================
-- 4. Drop affected RPC functions
-- ============================================================
DROP FUNCTION IF EXISTS add_submission_with_sets(text, text, jsonb, jsonb, text, text, integer);
DROP FUNCTION IF EXISTS add_set(uuid, text, text, jsonb, text, numeric, text, integer, text, text, numeric, text, integer);
DROP FUNCTION IF EXISTS get_user_workouts();
DROP FUNCTION IF EXISTS get_workout_details(uuid);
DROP FUNCTION IF EXISTS get_exercise_stats();
DROP FUNCTION IF EXISTS get_filtered_exercise_stats(text[], jsonb, text[], text);
DROP FUNCTION IF EXISTS filter_user_workouts(text[], text[], timestamptz, timestamptz);
DROP FUNCTION IF EXISTS get_workout_filter_options();
DROP FUNCTION IF EXISTS get_exercise_filter_options();
DROP FUNCTION IF EXISTS get_filter_relationships();

-- ============================================================
-- 5. Recreate add_submission_with_sets
-- ============================================================
CREATE OR REPLACE FUNCTION add_submission_with_sets(
  p_raw_text TEXT,
  p_submission_type TEXT,
  p_ai_response JSONB,
  p_logs JSONB,
  p_model_version TEXT DEFAULT 'gpt-4.1',
  p_prompt_version TEXT DEFAULT 'v2.0',
  p_audio_duration_seconds INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_submission_id UUID;
  v_workout_id UUID;
  v_last_set_time TIMESTAMPTZ;
  v_log JSONB;
  v_set_id UUID;
BEGIN
  -- Find most recent workout where last set was within 1 hour
  SELECT w.id, MAX(s.datetime) INTO v_workout_id, v_last_set_time
  FROM workouts w
  LEFT JOIN sets s ON s.workout_id = w.id
  WHERE w.user_id = v_user_id
  GROUP BY w.id
  HAVING MAX(s.datetime) > NOW() - INTERVAL '1 hour'
  ORDER BY MAX(s.datetime) DESC
  LIMIT 1;

  -- If no recent workout, create a new one
  IF v_workout_id IS NULL THEN
    INSERT INTO workouts (user_id, started_at, ended_at, datetime)
    VALUES (v_user_id, NOW(), NOW(), NOW())
    RETURNING id INTO v_workout_id;
  END IF;

  -- Create submission record (source of truth)
  INSERT INTO log_submissions (
    user_id,
    workout_id,
    submission_type,
    raw_text,
    ai_response,
    model_version,
    prompt_version,
    audio_duration_seconds
  )
  VALUES (
    v_user_id,
    v_workout_id,
    p_submission_type,
    p_raw_text,
    p_ai_response,
    p_model_version,
    p_prompt_version,
    p_audio_duration_seconds
  )
  RETURNING id INTO v_submission_id;

  -- Create all sets in a loop
  FOR v_log IN SELECT * FROM jsonb_array_elements(p_logs)
  LOOP
    -- Skip sets missing required fields
    IF (v_log->>'input') IS NULL OR (v_log->>'input') = '' THEN
      CONTINUE;
    END IF;
    IF (v_log->>'exercise_kind') IS NULL OR (v_log->>'exercise_kind') = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO sets (
      workout_id,
      submission_id,
      input,
      exercise_kind,
      modifiers,
      equipment,
      datetime,
      weight,
      weight_unit,
      repetitions,
      duration,
      effort,
      distance,
      distance_unit,
      resistance_level
    )
    VALUES (
      v_workout_id,
      v_submission_id,
      v_log->>'input',
      v_log->>'exercise_kind',
      COALESCE((v_log->>'modifiers')::jsonb, '[]'::jsonb),
      v_log->>'equipment',
      NOW(),
      (v_log->>'weight')::numeric,
      v_log->>'weight_unit',
      (v_log->>'repetitions')::integer,
      v_log->>'duration',
      v_log->>'effort',
      (v_log->>'distance')::numeric,
      v_log->>'distance_unit',
      (v_log->>'resistance_level')::integer
    )
    RETURNING id INTO v_set_id;
  END LOOP;

  -- Update workout end time
  UPDATE workouts
  SET ended_at = NOW()
  WHERE id = v_workout_id;

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_submission_with_sets TO authenticated;

-- ============================================================
-- 6. Recreate add_set
-- ============================================================
CREATE OR REPLACE FUNCTION add_set(
  p_submission_id UUID,
  p_input TEXT,
  p_exercise_kind TEXT,
  p_modifiers JSONB DEFAULT '[]'::jsonb,
  p_equipment TEXT DEFAULT NULL,
  p_weight NUMERIC DEFAULT NULL,
  p_weight_unit TEXT DEFAULT NULL,
  p_repetitions INTEGER DEFAULT NULL,
  p_duration TEXT DEFAULT NULL,
  p_effort TEXT DEFAULT NULL,
  p_distance NUMERIC DEFAULT NULL,
  p_distance_unit TEXT DEFAULT NULL,
  p_resistance_level INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_set_id UUID;
  v_workout_id UUID;
BEGIN
  IF p_input IS NULL OR p_input = '' THEN
    RAISE EXCEPTION 'input is required';
  END IF;

  IF p_exercise_kind IS NULL OR p_exercise_kind = '' THEN
    RAISE EXCEPTION 'exercise_kind is required';
  END IF;

  -- Get workout_id from submission (with security check)
  SELECT workout_id INTO v_workout_id
  FROM log_submissions
  WHERE id = p_submission_id
    AND user_id = auth.uid();

  IF v_workout_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found or does not belong to user';
  END IF;

  INSERT INTO sets (
    workout_id,
    submission_id,
    input,
    exercise_kind,
    modifiers,
    equipment,
    datetime,
    weight,
    weight_unit,
    repetitions,
    duration,
    effort,
    distance,
    distance_unit,
    resistance_level
  )
  VALUES (
    v_workout_id,
    p_submission_id,
    p_input,
    p_exercise_kind,
    p_modifiers,
    p_equipment,
    NOW(),
    p_weight,
    p_weight_unit,
    p_repetitions,
    p_duration,
    p_effort,
    p_distance,
    p_distance_unit,
    p_resistance_level
  )
  RETURNING id INTO v_set_id;

  UPDATE workouts
  SET ended_at = NOW()
  WHERE id = v_workout_id;

  RETURN v_set_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_set TO authenticated;

-- ============================================================
-- 7. Recreate get_user_workouts
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_workouts()
RETURNS TABLE(
  id uuid,
  datetime timestamp with time zone,
  "exerciseCount" bigint,
  "setCount" bigint,
  "mostRecentLog" timestamp with time zone,
  "exercisePreview" jsonb,
  "totalVolume" numeric,
  "totalDistance" numeric,
  "distanceUnit" text,
  "durationMinutes" integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.datetime,

    COUNT(DISTINCT (s.exercise_kind, s.modifiers::text, s.equipment))
      FILTER (WHERE s.exercise_kind IS NOT NULL) as "exerciseCount",

    COUNT(s.id) as "setCount",

    COALESCE(MAX(s.datetime), w.datetime) as "mostRecentLog",

    (
      SELECT COALESCE(jsonb_agg(exercise_kind), '[]'::jsonb)
      FROM (
        SELECT DISTINCT s2.exercise_kind
        FROM sets s2
        WHERE s2.workout_id = w.id AND s2.exercise_kind IS NOT NULL
        ORDER BY s2.exercise_kind
        LIMIT 3
      ) e2
    ) as "exercisePreview",

    COALESCE(
      SUM(COALESCE(s.weight, 0) * COALESCE(s.repetitions, 0))
      FILTER (WHERE s.weight IS NOT NULL AND s.repetitions IS NOT NULL),
      0
    ) as "totalVolume",

    COALESCE(SUM(s.distance) FILTER (WHERE s.distance IS NOT NULL), 0) as "totalDistance",

    (
      SELECT s2.distance_unit
      FROM sets s2
      WHERE s2.workout_id = w.id AND s2.distance_unit IS NOT NULL
      GROUP BY s2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit",

    COALESCE(
      EXTRACT(EPOCH FROM (
        MAX(s.datetime + (
          COALESCE(parse_iso8601_duration_to_seconds(s.duration), 300) || ' seconds'
        )::interval) - w.datetime
      )) / 60,
      0
    )::integer as "durationMinutes"

  FROM workouts w
  INNER JOIN sets s ON s.workout_id = w.id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id, w.datetime
  HAVING COUNT(s.id) > 0
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_workouts() TO authenticated;

-- ============================================================
-- 8. Recreate get_workout_details
-- ============================================================
CREATE OR REPLACE FUNCTION get_workout_details(p_workout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', w.id,
    'datetime', w.datetime,
    'endTime', (
      SELECT MAX(s2.datetime + (
        COALESCE(parse_iso8601_duration_to_seconds(s2.duration), 300) || ' seconds'
      )::interval)
      FROM sets s2
      WHERE s2.workout_id = w.id
    ),
    'exercises', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'exercise_kind', we.exercise_kind,
            'modifiers', we.modifiers,
            'equipment', we.equipment,
            'sets', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', s.id,
                  'input', s.input,
                  'datetime', s.datetime,
                  'weight', s.weight,
                  'weightUnit', s.weight_unit,
                  'repetitions', s.repetitions,
                  'distance', s.distance,
                  'distanceUnit', s.distance_unit,
                  'resistanceLevel', s.resistance_level,
                  'duration', s.duration,
                  'effort', s.effort
                )
                ORDER BY s.datetime
              ), '[]'::jsonb)
              FROM sets s
              WHERE s.workout_id = w.id
                AND s.exercise_kind = we.exercise_kind
                AND COALESCE(s.modifiers, '[]'::jsonb) = COALESCE(we.modifiers, '[]'::jsonb)
                AND COALESCE(s.equipment, '') = COALESCE(we.equipment, '')
            )
          )
          ORDER BY we.datetime
        )
        FROM workout_exercises we
        WHERE we.workout_id = w.id
      ), '[]'::jsonb
    )
  )
  INTO v_result
  FROM workouts w
  WHERE w.id = p_workout_id
    AND w.user_id = auth.uid();

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workout_details(uuid) TO authenticated;

-- ============================================================
-- 9. Recreate get_exercise_stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_exercise_stats()
RETURNS TABLE(
  exercise_kind text,
  modifiers jsonb,
  equipment text,
  total_workouts bigint,
  total_volume numeric,
  total_distance numeric,
  alltime_max_weight numeric,
  alltime_max_distance numeric,
  alltime_avg_pace numeric,
  alltime_max_reps numeric,
  recent_workouts_per_week numeric,
  recent_volume_per_week numeric,
  recent_distance_per_week numeric,
  recent_max_weight numeric,
  recent_max_distance numeric,
  recent_avg_pace numeric,
  recent_max_reps numeric,
  prev_workouts_per_week numeric,
  prev_volume_per_week numeric,
  prev_distance_per_week numeric,
  prev_max_weight numeric,
  prev_max_distance numeric,
  prev_avg_pace numeric,
  prev_max_reps numeric,
  last_logged timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH exercise_groups AS (
    SELECT DISTINCT
      s.exercise_kind,
      COALESCE(s.modifiers, '[]'::jsonb) as modifiers,
      s.equipment
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
  ),
  alltime_stats AS (
    SELECT
      s.exercise_kind,
      COALESCE(s.modifiers, '[]'::jsonb) as modifiers,
      s.equipment,
      COUNT(DISTINCT w.id) as total_workouts,
      SUM(COALESCE(s.weight, 0) * COALESCE(s.repetitions, 0)) as total_volume,
      SUM(s.distance) FILTER (WHERE s.distance IS NOT NULL) as total_distance,
      MAX(s.weight) as max_weight,
      MAX(s.distance) as max_distance,
      AVG(
        CASE
          WHEN s.distance IS NOT NULL AND s.distance > 0 AND s.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM s.duration::interval)::NUMERIC / 60.0) / s.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(s.repetitions) as max_reps,
      MAX(w.datetime) as last_logged
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
    GROUP BY s.exercise_kind, s.modifiers, s.equipment
  ),
  recent_stats AS (
    SELECT
      s.exercise_kind,
      COALESCE(s.modifiers, '[]'::jsonb) as modifiers,
      s.equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(s.weight, 0) * COALESCE(s.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(s.distance) FILTER (WHERE s.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(s.weight) as max_weight,
      MAX(s.distance) as max_distance,
      AVG(
        CASE
          WHEN s.distance IS NOT NULL AND s.distance > 0 AND s.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM s.duration::interval)::NUMERIC / 60.0) / s.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(s.repetitions) as max_reps
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '4 weeks'
    GROUP BY s.exercise_kind, s.modifiers, s.equipment
  ),
  prev_stats AS (
    SELECT
      s.exercise_kind,
      COALESCE(s.modifiers, '[]'::jsonb) as modifiers,
      s.equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(s.weight, 0) * COALESCE(s.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(s.distance) FILTER (WHERE s.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(s.weight) as max_weight,
      MAX(s.distance) as max_distance,
      AVG(
        CASE
          WHEN s.distance IS NOT NULL AND s.distance > 0 AND s.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM s.duration::interval)::NUMERIC / 60.0) / s.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(s.repetitions) as max_reps
    FROM workouts w
    JOIN sets s ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '8 weeks'
      AND w.datetime < NOW() - INTERVAL '4 weeks'
    GROUP BY s.exercise_kind, s.modifiers, s.equipment
  )
  SELECT
    eg.exercise_kind,
    eg.modifiers,
    eg.equipment,
    COALESCE(at.total_workouts, 0)::bigint,
    COALESCE(at.total_volume, 0)::numeric,
    COALESCE(at.total_distance, 0)::numeric,
    at.max_weight,
    at.max_distance,
    at.avg_pace,
    at.max_reps::numeric,
    COALESCE(r.workouts_per_week, 0)::numeric,
    COALESCE(r.volume_per_week, 0)::numeric,
    COALESCE(r.distance_per_week, 0)::numeric,
    r.max_weight,
    r.max_distance,
    r.avg_pace,
    r.max_reps::numeric,
    COALESCE(p.workouts_per_week, 0)::numeric,
    COALESCE(p.volume_per_week, 0)::numeric,
    COALESCE(p.distance_per_week, 0)::numeric,
    p.max_weight,
    p.max_distance,
    p.avg_pace,
    p.max_reps::numeric,
    at.last_logged
  FROM exercise_groups eg
  LEFT JOIN alltime_stats at
    ON at.exercise_kind = eg.exercise_kind
    AND at.modifiers = eg.modifiers
    AND COALESCE(at.equipment, '') = COALESCE(eg.equipment, '')
  LEFT JOIN recent_stats r
    ON r.exercise_kind = eg.exercise_kind
    AND r.modifiers = eg.modifiers
    AND COALESCE(r.equipment, '') = COALESCE(eg.equipment, '')
  LEFT JOIN prev_stats p
    ON p.exercise_kind = eg.exercise_kind
    AND p.modifiers = eg.modifiers
    AND COALESCE(p.equipment, '') = COALESCE(eg.equipment, '')
  WHERE at.total_workouts > 0
  ORDER BY at.total_workouts DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exercise_stats() TO authenticated;

-- ============================================================
-- 10. Recreate get_filtered_exercise_stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_filtered_exercise_stats(
  p_exercise_kinds text[] DEFAULT NULL,
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
  total_duration_seconds numeric,
  max_duration_seconds numeric,
  best_pace numeric,
  max_resistance_level integer,
  weight_unit text,
  distance_unit text,
  weight_pr jsonb,
  reps_pr jsonb,
  progress_data jsonb,
  recent_sessions jsonb,
  first_logged timestamptz,
  last_logged timestamptz,
  applied_filters jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time_filter timestamptz;
  v_default_exercise_kind text;
  v_default_equipment text;
  v_has_filters boolean;
  v_applied_exercise_kinds text[];
  v_applied_equipment text[];
BEGIN
  v_time_filter := CASE p_time_range
    WHEN '1_month' THEN now() - interval '1 month'
    WHEN '3_months' THEN now() - interval '3 months'
    WHEN '1_year' THEN now() - interval '1 year'
    ELSE NULL
  END;

  v_has_filters := (p_exercise_kinds IS NOT NULL AND array_length(p_exercise_kinds, 1) > 0)
                OR (p_modifiers IS NOT NULL AND jsonb_array_length(p_modifiers) > 0)
                OR (p_equipment IS NOT NULL AND array_length(p_equipment, 1) > 0);

  v_applied_exercise_kinds := p_exercise_kinds;
  v_applied_equipment := p_equipment;

  IF NOT v_has_filters THEN
    SELECT s.exercise_kind, s.equipment
    INTO v_default_exercise_kind, v_default_equipment
    FROM sets s
    INNER JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = auth.uid() AND s.exercise_kind IS NOT NULL
    ORDER BY s.datetime DESC
    LIMIT 1;

    IF v_default_exercise_kind IS NOT NULL THEN
      p_exercise_kinds := ARRAY[v_default_exercise_kind];
      v_applied_exercise_kinds := p_exercise_kinds;
      IF v_default_equipment IS NOT NULL THEN
        p_equipment := ARRAY[v_default_equipment];
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
      s.weight,
      s.weight_unit,
      s.repetitions,
      s.distance,
      s.distance_unit,
      s.duration,
      s.resistance_level,
      s.datetime,
      w.datetime as workout_datetime
    FROM sets s
    INNER JOIN workouts w ON s.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND (p_exercise_kinds IS NULL OR s.exercise_kind = ANY(p_exercise_kinds))
      AND (p_equipment IS NULL OR s.equipment = ANY(p_equipment))
      AND (p_modifiers IS NULL OR s.modifiers @> p_modifiers)
      AND (v_time_filter IS NULL OR s.datetime >= v_time_filter)
  ),
  mode_units AS (
    SELECT
      mode() WITHIN GROUP (ORDER BY fs.weight_unit)   AS mode_weight_unit,
      mode() WITHIN GROUP (ORDER BY fs.distance_unit) AS mode_distance_unit
    FROM filtered_sets fs
  ),
  exercise_groups AS (
    SELECT DISTINCT exercise_kind, equipment
    FROM filtered_sets
    WHERE exercise_kind IS NOT NULL
  ),
  aggregates AS (
    SELECT
      COUNT(DISTINCT fs.workout_id) as total_workouts,
      COUNT(*) as total_sets,
      COALESCE(SUM(COALESCE(fs.weight, 0) * COALESCE(fs.repetitions, 0)), 0) as total_volume,
      COALESCE(SUM(fs.distance), 0) as total_distance,
      MAX(fs.weight) as max_weight,
      MAX(fs.repetitions)::integer as max_reps,
      COALESCE(SUM(
        CASE WHEN fs.duration IS NOT NULL
          THEN parse_iso8601_duration_to_seconds(fs.duration) ELSE 0 END
      ), 0) as total_duration_seconds,
      MAX(CASE WHEN fs.duration IS NOT NULL
          THEN parse_iso8601_duration_to_seconds(fs.duration) END) as max_duration_seconds,
      MIN(CASE WHEN fs.duration IS NOT NULL
               AND fs.distance IS NOT NULL AND fs.distance > 0
          THEN parse_iso8601_duration_to_seconds(fs.duration) / 60.0 / fs.distance
          END) as best_pace,
      MAX(fs.resistance_level)::integer as max_resistance_level,
      MIN(fs.datetime) as first_logged,
      MAX(fs.datetime) as last_logged
    FROM filtered_sets fs
  ),
  weight_pr AS (
    SELECT jsonb_build_object(
      'value', fs.weight,
      'date', fs.datetime,
      'exercise', fs.exercise_kind || COALESCE(' (' || fs.equipment || ')', '')
    ) as pr
    FROM filtered_sets fs
    WHERE fs.weight IS NOT NULL
    ORDER BY fs.weight DESC, fs.datetime ASC
    LIMIT 1
  ),
  reps_pr AS (
    SELECT jsonb_build_object(
      'value', fs.repetitions,
      'date', fs.datetime,
      'exercise', fs.exercise_kind || COALESCE(' (' || fs.equipment || ')', '')
    ) as pr
    FROM filtered_sets fs
    WHERE fs.repetitions IS NOT NULL
    ORDER BY fs.repetitions DESC, fs.datetime ASC
    LIMIT 1
  ),
  weekly_progress AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'week', week_start,
        'volume', week_volume,
        'maxWeight', week_max_weight,
        'maxReps', week_max_reps,
        'distance', week_distance,
        'avgPace', week_avg_pace,
        'maxDuration', week_max_duration,
        'maxResistance', week_max_resistance
      )
      ORDER BY week_start
    ) as data
    FROM (
      SELECT
        date_trunc('week', fs.datetime)::date as week_start,
        SUM(COALESCE(fs.weight, 0) * COALESCE(fs.repetitions, 0)) as week_volume,
        MAX(fs.weight) as week_max_weight,
        MAX(fs.repetitions) as week_max_reps,
        SUM(fs.distance) as week_distance,
        AVG(CASE WHEN fs.duration IS NOT NULL
                 AND fs.distance IS NOT NULL AND fs.distance > 0
            THEN parse_iso8601_duration_to_seconds(fs.duration) / 60.0 / fs.distance
            END) as week_avg_pace,
        MAX(CASE WHEN fs.duration IS NOT NULL
            THEN parse_iso8601_duration_to_seconds(fs.duration) END) as week_max_duration,
        MAX(fs.resistance_level) as week_max_resistance
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
        'date', workout_date,
        'summary', summary
      )
      ORDER BY workout_date DESC
    ) as sessions
    FROM (
      SELECT DISTINCT ON (fs.workout_id)
        fs.workout_id,
        fs.workout_datetime as workout_date,
        (
          SELECT COUNT(*) || 'x' ||
            COALESCE(MAX(fs2.repetitions)::text, '?') ||
            CASE WHEN MAX(fs2.weight) IS NOT NULL
              THEN ' @ ' || MAX(fs2.weight)::text ||
                   ' ' || COALESCE((SELECT mode_weight_unit FROM mode_units), 'lbs')
              ELSE ''
            END
          FROM filtered_sets fs2
          WHERE fs2.workout_id = fs.workout_id
        ) as summary
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
    COALESCE(a.total_duration_seconds, 0)::numeric,
    a.max_duration_seconds,
    a.best_pace,
    a.max_resistance_level,
    (SELECT mode_weight_unit FROM mode_units),
    (SELECT mode_distance_unit FROM mode_units),
    (SELECT pr FROM weight_pr),
    (SELECT pr FROM reps_pr),
    COALESCE((SELECT data FROM weekly_progress), '[]'::jsonb),
    COALESCE((SELECT sessions FROM recent), '[]'::jsonb),
    a.first_logged,
    a.last_logged,
    jsonb_build_object(
      'exercise_kinds', COALESCE(to_jsonb(v_applied_exercise_kinds), '[]'::jsonb),
      'equipment', COALESCE(to_jsonb(v_applied_equipment), '[]'::jsonb),
      'modifiers', COALESCE(p_modifiers, '[]'::jsonb),
      'timeRange', p_time_range
    )
  FROM aggregates a;
END;
$$;

GRANT EXECUTE ON FUNCTION get_filtered_exercise_stats(text[], jsonb, text[], text) TO authenticated;

-- ============================================================
-- 11. Recreate filter_user_workouts
-- ============================================================
CREATE OR REPLACE FUNCTION filter_user_workouts(
  p_exercise_kinds text[] DEFAULT NULL,
  p_equipment text[] DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  datetime timestamp with time zone,
  "exerciseCount" bigint,
  "setCount" bigint,
  "mostRecentLog" timestamp with time zone,
  "exercisePreview" jsonb,
  "totalVolume" numeric,
  "totalDistance" numeric,
  "distanceUnit" text,
  "durationMinutes" integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.datetime,

    COUNT(DISTINCT (s.exercise_kind, s.modifiers::text, s.equipment))
      FILTER (WHERE s.exercise_kind IS NOT NULL) as "exerciseCount",

    COALESCE(COUNT(s.id), 0) as "setCount",

    COALESCE(MAX(s.datetime), w.datetime) as "mostRecentLog",

    (
      SELECT COALESCE(jsonb_agg(exercise_kind), '[]'::jsonb)
      FROM (
        SELECT DISTINCT s2.exercise_kind
        FROM sets s2
        WHERE s2.workout_id = w.id
          AND s2.exercise_kind IS NOT NULL
          AND (p_exercise_kinds IS NULL OR s2.exercise_kind = ANY(p_exercise_kinds))
          AND (p_equipment IS NULL OR s2.equipment = ANY(p_equipment))
        ORDER BY s2.exercise_kind
        LIMIT 3
      ) e2
    ) as "exercisePreview",

    COALESCE(
      SUM(COALESCE(s.weight, 0) * COALESCE(s.repetitions, 0))
      FILTER (WHERE s.weight IS NOT NULL AND s.repetitions IS NOT NULL),
      0
    ) as "totalVolume",

    COALESCE(SUM(s.distance) FILTER (WHERE s.distance IS NOT NULL), 0) as "totalDistance",

    (
      SELECT s2.distance_unit
      FROM sets s2
      WHERE s2.workout_id = w.id AND s2.distance_unit IS NOT NULL
      GROUP BY s2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit",

    COALESCE(
      EXTRACT(EPOCH FROM (
        MAX(s.datetime + (
          COALESCE(parse_iso8601_duration_to_seconds(s.duration), 300) || ' seconds'
        )::interval) - w.datetime
      )) / 60,
      0
    )::integer as "durationMinutes"

  FROM workouts w
  INNER JOIN sets s ON s.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND (p_exercise_kinds IS NULL OR s.exercise_kind = ANY(p_exercise_kinds))
    AND (p_equipment IS NULL OR s.equipment = ANY(p_equipment))
    AND (p_date_from IS NULL OR w.datetime >= p_date_from)
    AND (p_date_to IS NULL OR w.datetime <= p_date_to)
  GROUP BY w.id, w.datetime
  HAVING COUNT(s.id) > 0
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION filter_user_workouts(text[], text[], timestamptz, timestamptz) TO authenticated;

-- ============================================================
-- 12. Recreate get_workout_filter_options
-- ============================================================
CREATE OR REPLACE FUNCTION get_workout_filter_options()
RETURNS TABLE(
  exercise_kinds jsonb,
  equipment jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT jsonb_agg(DISTINCT s.exercise_kind ORDER BY s.exercise_kind)
       FROM sets s
       INNER JOIN workouts w ON s.workout_id = w.id
       WHERE w.user_id = auth.uid() AND s.exercise_kind IS NOT NULL),
      '[]'::jsonb
    ) as exercise_kinds,

    COALESCE(
      (SELECT jsonb_agg(DISTINCT s.equipment ORDER BY s.equipment)
       FROM sets s
       INNER JOIN workouts w ON s.workout_id = w.id
       WHERE w.user_id = auth.uid() AND s.equipment IS NOT NULL),
      '[]'::jsonb
    ) as equipment;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workout_filter_options() TO authenticated;

-- ============================================================
-- 13. Recreate get_exercise_filter_options
-- ============================================================
CREATE OR REPLACE FUNCTION get_exercise_filter_options()
RETURNS TABLE(
  exercise_kinds jsonb,
  modifiers jsonb,
  equipment jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT jsonb_agg(DISTINCT s.exercise_kind ORDER BY s.exercise_kind)
       FROM sets s
       INNER JOIN workouts w ON s.workout_id = w.id
       WHERE w.user_id = auth.uid() AND s.exercise_kind IS NOT NULL),
      '[]'::jsonb
    ) as exercise_kinds,

    COALESCE(
      (SELECT jsonb_agg(DISTINCT mod ORDER BY mod)
       FROM sets s
       INNER JOIN workouts w ON s.workout_id = w.id
       CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(s.modifiers, '[]'::jsonb)) as mod
       WHERE w.user_id = auth.uid()),
      '[]'::jsonb
    ) as modifiers,

    COALESCE(
      (SELECT jsonb_agg(DISTINCT s.equipment ORDER BY s.equipment)
       FROM sets s
       INNER JOIN workouts w ON s.workout_id = w.id
       WHERE w.user_id = auth.uid() AND s.equipment IS NOT NULL),
      '[]'::jsonb
    ) as equipment;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exercise_filter_options() TO authenticated;

-- ============================================================
-- 14. Recreate get_filter_relationships
-- ============================================================
CREATE OR REPLACE FUNCTION get_filter_relationships()
RETURNS TABLE(
  exercise_kind text,
  equipment text,
  modifiers jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    s.exercise_kind,
    s.equipment,
    COALESCE(s.modifiers, '[]'::jsonb) as modifiers
  FROM sets s
  INNER JOIN workouts w ON s.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND s.exercise_kind IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_filter_relationships() TO authenticated;

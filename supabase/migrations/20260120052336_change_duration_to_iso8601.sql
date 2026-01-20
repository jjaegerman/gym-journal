-- Change duration column from INTEGER (seconds) to TEXT (ISO 8601 duration)
-- This allows storing durations like "PT30M", "PT1H15M30S" directly from OpenAI

-- Step 1: Create helper function to parse ISO 8601 duration to seconds
-- Supports formats like: PT30S, PT5M30S, PT1H30M, PT1H15M30S
CREATE OR REPLACE FUNCTION parse_iso8601_duration_to_seconds(duration_str TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  hours INTEGER := 0;
  minutes INTEGER := 0;
  seconds NUMERIC := 0;
  temp_str TEXT;
BEGIN
  -- Return NULL for NULL input
  IF duration_str IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remove 'PT' prefix if present
  temp_str := REGEXP_REPLACE(duration_str, '^PT', '');

  -- Extract hours (e.g., "1H30M" -> "1")
  IF temp_str ~ '\d+H' THEN
    hours := SUBSTRING(temp_str FROM '(\d+)H')::INTEGER;
    temp_str := REGEXP_REPLACE(temp_str, '\d+H', '');
  END IF;

  -- Extract minutes (e.g., "30M15S" -> "30")
  IF temp_str ~ '\d+M' THEN
    minutes := SUBSTRING(temp_str FROM '(\d+)M')::INTEGER;
    temp_str := REGEXP_REPLACE(temp_str, '\d+M', '');
  END IF;

  -- Extract seconds (e.g., "15.5S" -> "15.5")
  IF temp_str ~ '\d+(\.\d+)?S' THEN
    seconds := SUBSTRING(temp_str FROM '(\d+(\.\d+)?)S')::NUMERIC;
  END IF;

  -- Convert to total seconds
  RETURN (hours * 3600) + (minutes * 60) + seconds;
END;
$$;

GRANT EXECUTE ON FUNCTION parse_iso8601_duration_to_seconds TO authenticated;

COMMENT ON FUNCTION parse_iso8601_duration_to_seconds IS
  'Parses ISO 8601 duration string (e.g., "PT30M", "PT1H15M30S") to total seconds';

-- Step 2: Alter the duration column type from INTEGER to TEXT
-- Convert existing integer seconds to ISO 8601 format (e.g., 1800 -> "PT30M")
ALTER TABLE logs
ALTER COLUMN duration TYPE TEXT
USING CASE
  WHEN duration IS NOT NULL THEN
    'PT' ||
    CASE WHEN duration >= 3600 THEN (duration / 3600)::TEXT || 'H' ELSE '' END ||
    CASE WHEN (duration % 3600) >= 60 THEN ((duration % 3600) / 60)::TEXT || 'M' ELSE '' END ||
    CASE WHEN (duration % 60) > 0 THEN (duration % 60)::TEXT || 'S' ELSE '' END
  ELSE NULL
END;

COMMENT ON COLUMN logs.duration IS 'Duration in ISO 8601 format (e.g., "PT30M", "PT1H15M30S")';

-- Step 3: Update add_submission_with_logs function to pass duration as-is
DROP FUNCTION IF EXISTS add_submission_with_logs(text, text, jsonb, jsonb, text, text, integer);

CREATE OR REPLACE FUNCTION add_submission_with_logs(
  p_raw_text TEXT,
  p_submission_type TEXT,
  p_ai_response JSONB,
  p_logs JSONB,  -- Array of log objects
  p_model_version TEXT DEFAULT 'gpt-4.1',
  p_prompt_version TEXT DEFAULT 'v1.0',
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
  v_last_log_time TIMESTAMPTZ;
  v_log JSONB;
  v_log_id UUID;
BEGIN
  -- Find most recent workout where last log was within 1 hour
  SELECT w.id, MAX(l.datetime) INTO v_workout_id, v_last_log_time
  FROM workouts w
  LEFT JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = v_user_id
  GROUP BY w.id
  HAVING MAX(l.datetime) > NOW() - INTERVAL '1 hour'
  ORDER BY MAX(l.datetime) DESC
  LIMIT 1;

  -- If no recent workout, create a new one
  IF v_workout_id IS NULL THEN
    INSERT INTO workouts (user_id, started_at, ended_at, datetime)
    VALUES (v_user_id, NOW(), NOW(), NOW())
    RETURNING id INTO v_workout_id;
  END IF;

  -- Create submission record (source of truth)
  INSERT INTO workout_submissions (
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

  -- Create all logs in a loop
  FOR v_log IN SELECT * FROM jsonb_array_elements(p_logs)
  LOOP
    INSERT INTO logs (
      workout_id,
      submission_id,
      exercise_type,
      exercise_variants,
      exercise_name,
      exercise_equipment,
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
      v_log->>'exercise_type',
      (v_log->>'exercise_variants')::jsonb,
      v_log->>'exercise_name',
      v_log->>'exercise_equipment',
      NOW(),
      (v_log->>'weight')::numeric,
      v_log->>'weight_unit',
      (v_log->>'repetitions')::integer,
      v_log->>'duration',  -- Changed: pass as-is (TEXT), no ::integer cast
      v_log->>'effort',
      (v_log->>'distance')::numeric,
      v_log->>'distance_unit',
      (v_log->>'resistance_level')::integer
    )
    RETURNING id INTO v_log_id;
  END LOOP;

  -- Update workout end time
  UPDATE workouts
  SET ended_at = NOW()
  WHERE id = v_workout_id;

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_submission_with_logs TO authenticated;

COMMENT ON FUNCTION add_submission_with_logs IS
  'Atomically creates submission and all logs with new exercise schema (variants array, exercise_name)';

-- Step 4: Update get_exercise_stats function to use helper function for pace calculation
DROP FUNCTION IF EXISTS public.get_exercise_stats();

CREATE OR REPLACE FUNCTION public.get_exercise_stats()
RETURNS TABLE(
  exercise_type text,
  exercise_variants jsonb,
  exercise_equipment text,

  -- All-time stats
  total_workouts bigint,
  total_volume numeric,
  total_distance numeric,
  alltime_max_weight numeric,
  alltime_max_distance numeric,
  alltime_avg_pace numeric,

  -- Recent 4 weeks
  recent_workouts_per_week numeric,
  recent_volume_per_week numeric,
  recent_distance_per_week numeric,
  recent_max_weight numeric,
  recent_max_distance numeric,
  recent_avg_pace numeric,

  -- Previous 4 weeks (for trends)
  prev_workouts_per_week numeric,
  prev_volume_per_week numeric,
  prev_distance_per_week numeric,
  prev_max_weight numeric,
  prev_max_distance numeric,
  prev_avg_pace numeric,

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
      l.exercise_type,
      COALESCE(l.exercise_variants, '[]'::jsonb) as exercise_variants,
      l.exercise_equipment
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
  ),
  alltime_stats AS (
    SELECT
      l.exercise_type,
      COALESCE(l.exercise_variants, '[]'::jsonb) as exercise_variants,
      l.exercise_equipment,
      COUNT(DISTINCT w.id) as total_workouts,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as total_volume,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) as total_distance,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (parse_iso8601_duration_to_seconds(l.duration) / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(w.datetime) as last_logged
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
    GROUP BY l.exercise_type, l.exercise_variants, l.exercise_equipment
  ),
  recent_stats AS (
    SELECT
      l.exercise_type,
      COALESCE(l.exercise_variants, '[]'::jsonb) as exercise_variants,
      l.exercise_equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (parse_iso8601_duration_to_seconds(l.duration) / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '4 weeks'
    GROUP BY l.exercise_type, l.exercise_variants, l.exercise_equipment
  ),
  prev_stats AS (
    SELECT
      l.exercise_type,
      COALESCE(l.exercise_variants, '[]'::jsonb) as exercise_variants,
      l.exercise_equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (parse_iso8601_duration_to_seconds(l.duration) / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '8 weeks'
      AND w.datetime < NOW() - INTERVAL '4 weeks'
    GROUP BY l.exercise_type, l.exercise_variants, l.exercise_equipment
  )
  SELECT
    eg.exercise_type,
    eg.exercise_variants,
    eg.exercise_equipment,

    -- All-time
    COALESCE(at.total_workouts, 0)::bigint,
    COALESCE(at.total_volume, 0)::numeric,
    COALESCE(at.total_distance, 0)::numeric,
    at.max_weight,
    at.max_distance,
    at.avg_pace,

    -- Recent 4 weeks
    COALESCE(r.workouts_per_week, 0)::numeric,
    COALESCE(r.volume_per_week, 0)::numeric,
    COALESCE(r.distance_per_week, 0)::numeric,
    r.max_weight,
    r.max_distance,
    r.avg_pace,

    -- Previous 4 weeks
    COALESCE(p.workouts_per_week, 0)::numeric,
    COALESCE(p.volume_per_week, 0)::numeric,
    COALESCE(p.distance_per_week, 0)::numeric,
    p.max_weight,
    p.max_distance,
    p.avg_pace,

    at.last_logged
  FROM exercise_groups eg
  LEFT JOIN alltime_stats at
    ON at.exercise_type = eg.exercise_type
    AND at.exercise_variants = eg.exercise_variants
    AND COALESCE(at.exercise_equipment, '') = COALESCE(eg.exercise_equipment, '')
  LEFT JOIN recent_stats r
    ON r.exercise_type = eg.exercise_type
    AND r.exercise_variants = eg.exercise_variants
    AND COALESCE(r.exercise_equipment, '') = COALESCE(eg.exercise_equipment, '')
  LEFT JOIN prev_stats p
    ON p.exercise_type = eg.exercise_type
    AND p.exercise_variants = eg.exercise_variants
    AND COALESCE(p.exercise_equipment, '') = COALESCE(eg.exercise_equipment, '')
  WHERE at.total_workouts > 0
  ORDER BY at.total_workouts DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_exercise_stats() TO authenticated;

COMMENT ON FUNCTION public.get_exercise_stats IS
  'Returns exercise statistics with both all-time and recent (4 week) data for comparison';

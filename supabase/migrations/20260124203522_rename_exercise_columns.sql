-- Rename exercise columns for clarity:
-- exercise_name → input (raw spoken input, source of truth)
-- exercise_type → category (structured category enum)
-- exercise_variants → modifiers (variant modifiers array)
-- exercise_equipment → equipment (equipment used)

-- Drop dependent objects first
DROP VIEW IF EXISTS workout_exercises;
DROP FUNCTION IF EXISTS get_workout_details(uuid);
DROP FUNCTION IF EXISTS get_user_workouts();
DROP FUNCTION IF EXISTS get_exercise_stats();
DROP FUNCTION IF EXISTS add_log(uuid, jsonb, text, text, text, numeric, text, integer, integer, text, numeric, text, integer);
DROP FUNCTION IF EXISTS add_submission_with_logs(text, text, jsonb, jsonb, text, text, integer);

-- Rename columns
ALTER TABLE logs RENAME COLUMN exercise_name TO input;
ALTER TABLE logs RENAME COLUMN exercise_type TO category;
ALTER TABLE logs RENAME COLUMN exercise_variants TO modifiers;
ALTER TABLE logs RENAME COLUMN exercise_equipment TO equipment;

-- Update indexes (drop old, create new)
DROP INDEX IF EXISTS idx_logs_exercise_variants;
DROP INDEX IF EXISTS idx_logs_exercise_name;

CREATE INDEX IF NOT EXISTS idx_logs_modifiers ON logs USING GIN (modifiers);
CREATE INDEX IF NOT EXISTS idx_logs_input ON logs(input) WHERE input IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category) WHERE category IS NOT NULL;

-- Update column comments
COMMENT ON COLUMN logs.input IS 'Raw exercise input as spoken/typed (source of truth)';
COMMENT ON COLUMN logs.category IS 'Structured exercise category from enum';
COMMENT ON COLUMN logs.modifiers IS 'Array of variant modifiers (e.g., ["Incline", "Close Grip"])';
COMMENT ON COLUMN logs.equipment IS 'Equipment used for the exercise';

-- Recreate workout_exercises view with new column names
CREATE OR REPLACE VIEW workout_exercises AS
SELECT
  l.workout_id,
  l.input,
  l.category,
  COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
  l.equipment,

  -- Aggregated metrics
  COUNT(*) as total_sets,
  MAX(l.weight) as max_weight,
  MAX(l.repetitions) as max_reps,
  AVG(l.weight) FILTER (WHERE l.weight IS NOT NULL) as avg_weight,
  SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as total_volume,
  SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) as total_distance,

  -- Timestamps
  MIN(l.datetime) as first_logged,
  MAX(l.datetime) as last_logged,
  MIN(l.datetime) as datetime
FROM logs l
WHERE l.category IS NOT NULL
GROUP BY
  l.workout_id,
  l.input,
  l.category,
  l.modifiers,
  l.equipment;

GRANT SELECT ON workout_exercises TO authenticated;

COMMENT ON VIEW workout_exercises IS
  'Groups logs by exercise within a workout - groups by {input, category, modifiers, equipment}';

-- Recreate add_submission_with_logs function
CREATE OR REPLACE FUNCTION add_submission_with_logs(
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
      input,
      category,
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
      v_log->>'category',
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
  'Atomically creates submission and all logs with renamed columns (input, category, modifiers, equipment)';

-- Recreate add_log function
CREATE OR REPLACE FUNCTION add_log(
  p_submission_id UUID,
  p_input TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
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
  v_log_id UUID;
  v_workout_id UUID;
BEGIN
  -- Get workout_id from submission (with security check)
  SELECT workout_id INTO v_workout_id
  FROM workout_submissions
  WHERE id = p_submission_id
    AND user_id = auth.uid();

  IF v_workout_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found or does not belong to user';
  END IF;

  -- Insert log
  INSERT INTO logs (
    workout_id,
    submission_id,
    input,
    category,
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
    p_category,
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
  RETURNING id INTO v_log_id;

  -- Update workout end time
  UPDATE workouts
  SET ended_at = NOW()
  WHERE id = v_workout_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_log TO authenticated;

COMMENT ON FUNCTION add_log IS
  'Creates a log with renamed columns (input, category, modifiers, equipment)';

-- Recreate get_workout_details function
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
    'exercises', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'input', we.input,
            'category', we.category,
            'modifiers', we.modifiers,
            'equipment', we.equipment,
            'logs', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', l.id,
                  'datetime', l.datetime,
                  'weight', l.weight,
                  'weightUnit', l.weight_unit,
                  'repetitions', l.repetitions,
                  'distance', l.distance,
                  'distance_unit', l.distance_unit,
                  'resistance_level', l.resistance_level,
                  'duration', l.duration,
                  'effort', l.effort
                )
                ORDER BY l.datetime
              ), '[]'::jsonb)
              FROM logs l
              WHERE l.workout_id = w.id
                AND COALESCE(l.input, '') = COALESCE(we.input, '')
                AND l.category = we.category
                AND COALESCE(l.modifiers, '[]'::jsonb) = COALESCE(we.modifiers, '[]'::jsonb)
                AND COALESCE(l.equipment, '') = COALESCE(we.equipment, '')
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

COMMENT ON FUNCTION get_workout_details IS
  'Returns workout with exercises grouped by {input, category, modifiers, equipment}';

-- Recreate get_user_workouts function
CREATE OR REPLACE FUNCTION get_user_workouts()
RETURNS TABLE(
  id uuid,
  datetime timestamp with time zone,
  "exerciseCount" bigint,
  "logCount" bigint,
  "mostRecentLog" timestamp with time zone,
  "exercisePreview" jsonb,
  "totalVolume" numeric,
  "totalDistance" numeric,
  "distanceUnit" text
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

    -- Count distinct exercises (grouped by input, category, modifiers, equipment)
    COUNT(DISTINCT (l.input, l.category, l.modifiers::text, l.equipment))
      FILTER (WHERE l.category IS NOT NULL) as "exerciseCount",

    -- Count total logs
    COALESCE(COUNT(l.id), 0) as "logCount",

    -- Most recent log time
    COALESCE(MAX(l.datetime), w.datetime) as "mostRecentLog",

    -- Exercise preview: top 3 exercises as formatted strings
    (
      SELECT COALESCE(
        jsonb_agg(exercise_display),
        '[]'::jsonb
      )
      FROM (
        SELECT
          -- Format: {modifiers} {category} ({equipment})
          CASE
            WHEN l2.equipment IS NOT NULL THEN
              CONCAT(
                NULLIF(TRIM(CONCAT_WS(' ',
                  NULLIF(array_to_string(
                    (SELECT array_agg(elem ORDER BY elem)
                     FROM jsonb_array_elements_text(l2.modifiers) elem),
                    ' '
                  ), ''),
                  l2.category
                )), ''),
                ' (',
                l2.equipment,
                ')'
              )
            ELSE
              TRIM(CONCAT_WS(' ',
                NULLIF(array_to_string(
                  (SELECT array_agg(elem ORDER BY elem)
                   FROM jsonb_array_elements_text(l2.modifiers) elem),
                  ' '
                ), ''),
                l2.category
              ))
          END as exercise_display
        FROM logs l2
        WHERE l2.workout_id = w.id
        GROUP BY l2.input, l2.category, l2.modifiers, l2.equipment
        ORDER BY MIN(l2.datetime)
        LIMIT 3
      ) e2
    ) as "exercisePreview",

    -- Total volume (weight * reps summed)
    COALESCE(
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0))
      FILTER (WHERE l.weight IS NOT NULL AND l.repetitions IS NOT NULL),
      0
    ) as "totalVolume",

    -- Total distance (sum of all distance logs)
    COALESCE(
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL),
      0
    ) as "totalDistance",

    -- Distance unit (use the most common one in the workout)
    (
      SELECT l2.distance_unit
      FROM logs l2
      WHERE l2.workout_id = w.id AND l2.distance_unit IS NOT NULL
      GROUP BY l2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit"

  FROM workouts w
  LEFT JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id, w.datetime
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_workouts() TO authenticated;

COMMENT ON FUNCTION get_user_workouts IS
  'Returns all workouts for authenticated user with formatted exercise previews';

-- Recreate get_exercise_stats function
CREATE OR REPLACE FUNCTION get_exercise_stats()
RETURNS TABLE(
  category text,
  modifiers jsonb,
  equipment text,

  -- All-time stats
  total_workouts bigint,
  total_volume numeric,
  total_distance numeric,
  alltime_max_weight numeric,
  alltime_max_distance numeric,
  alltime_avg_pace numeric,
  alltime_max_reps numeric,

  -- Recent 4 weeks
  recent_workouts_per_week numeric,
  recent_volume_per_week numeric,
  recent_distance_per_week numeric,
  recent_max_weight numeric,
  recent_max_distance numeric,
  recent_avg_pace numeric,
  recent_max_reps numeric,

  -- Previous 4 weeks (for trends)
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
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
  ),
  alltime_stats AS (
    SELECT
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment,
      COUNT(DISTINCT w.id) as total_workouts,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as total_volume,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) as total_distance,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM l.duration::interval)::NUMERIC / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(l.repetitions) as max_reps,
      MAX(w.datetime) as last_logged
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
    GROUP BY l.category, l.modifiers, l.equipment
  ),
  recent_stats AS (
    SELECT
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM l.duration::interval)::NUMERIC / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(l.repetitions) as max_reps
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '4 weeks'
    GROUP BY l.category, l.modifiers, l.equipment
  ),
  prev_stats AS (
    SELECT
      l.category,
      COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
      l.equipment,
      COUNT(DISTINCT w.id)::NUMERIC / 4.0 as workouts_per_week,
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) / 4.0 as volume_per_week,
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) / 4.0 as distance_per_week,
      MAX(l.weight) as max_weight,
      MAX(l.distance) as max_distance,
      AVG(
        CASE
          WHEN l.distance IS NOT NULL AND l.distance > 0 AND l.duration IS NOT NULL
          THEN (EXTRACT(EPOCH FROM l.duration::interval)::NUMERIC / 60.0) / l.distance
          ELSE NULL
        END
      ) as avg_pace,
      MAX(l.repetitions) as max_reps
    FROM workouts w
    JOIN logs l ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
      AND w.datetime >= NOW() - INTERVAL '8 weeks'
      AND w.datetime < NOW() - INTERVAL '4 weeks'
    GROUP BY l.category, l.modifiers, l.equipment
  )
  SELECT
    eg.category,
    eg.modifiers,
    eg.equipment,

    -- All-time
    COALESCE(at.total_workouts, 0)::bigint,
    COALESCE(at.total_volume, 0)::numeric,
    COALESCE(at.total_distance, 0)::numeric,
    at.max_weight,
    at.max_distance,
    at.avg_pace,
    at.max_reps,

    -- Recent 4 weeks
    COALESCE(r.workouts_per_week, 0)::numeric,
    COALESCE(r.volume_per_week, 0)::numeric,
    COALESCE(r.distance_per_week, 0)::numeric,
    r.max_weight,
    r.max_distance,
    r.avg_pace,
    r.max_reps,

    -- Previous 4 weeks
    COALESCE(p.workouts_per_week, 0)::numeric,
    COALESCE(p.volume_per_week, 0)::numeric,
    COALESCE(p.distance_per_week, 0)::numeric,
    p.max_weight,
    p.max_distance,
    p.avg_pace,
    p.max_reps,

    at.last_logged
  FROM exercise_groups eg
  LEFT JOIN alltime_stats at
    ON at.category = eg.category
    AND at.modifiers = eg.modifiers
    AND COALESCE(at.equipment, '') = COALESCE(eg.equipment, '')
  LEFT JOIN recent_stats r
    ON r.category = eg.category
    AND r.modifiers = eg.modifiers
    AND COALESCE(r.equipment, '') = COALESCE(eg.equipment, '')
  LEFT JOIN prev_stats p
    ON p.category = eg.category
    AND p.modifiers = eg.modifiers
    AND COALESCE(p.equipment, '') = COALESCE(eg.equipment, '')
  WHERE at.total_workouts > 0
  ORDER BY at.total_workouts DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exercise_stats() TO authenticated;

COMMENT ON FUNCTION get_exercise_stats IS
  'Returns exercise statistics grouped by {category, modifiers, equipment}';

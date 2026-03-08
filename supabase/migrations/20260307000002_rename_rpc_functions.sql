-- Clean up stale/broken RPC function names after logs→sets rename

-- ============================================================
-- 1. Drop broken unused functions (reference dropped tables)
-- ============================================================
DROP FUNCTION IF EXISTS add_submission(text, text, jsonb, text, text, integer);
DROP FUNCTION IF EXISTS get_cascaded_filter_options(text[], text[]);

-- ============================================================
-- 2. Rename add_submission_with_logs → add_submission_with_sets
-- ============================================================
DROP FUNCTION IF EXISTS add_submission_with_logs(text, text, jsonb, jsonb, text, text, integer);

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
    IF (v_log->>'category') IS NULL OR (v_log->>'category') = '' THEN
      CONTINUE;
    END IF;

    INSERT INTO sets (
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
-- 3. Rename add_log → add_set
-- ============================================================
DROP FUNCTION IF EXISTS add_log(uuid, text, text, jsonb, text, numeric, text, integer, text, text, numeric, text, integer);

CREATE OR REPLACE FUNCTION add_set(
  p_submission_id UUID,
  p_input TEXT,
  p_category TEXT,
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

  IF p_category IS NULL OR p_category = '' THEN
    RAISE EXCEPTION 'category is required';
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
  RETURNING id INTO v_set_id;

  UPDATE workouts
  SET ended_at = NOW()
  WHERE id = v_workout_id;

  RETURN v_set_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_set TO authenticated;

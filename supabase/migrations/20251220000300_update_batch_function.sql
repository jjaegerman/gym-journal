-- Update add_submission_with_logs to handle new exercise schema
-- Changes: exercise_variant → exercise_variants (JSONB), add exercise_name

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
      (v_log->>'duration')::integer,
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

-- Fix set datetime in add_submission_to_workout.
-- Previously used the workout's original start datetime for all new sets,
-- which caused them to sort in the middle of existing sets rather than at the end.
-- Now uses MAX(datetime) of existing sets + 1 second per set index.

CREATE OR REPLACE FUNCTION add_submission_to_workout(
  p_workout_id UUID,
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
  v_workout_datetime TIMESTAMPTZ;
  v_base_datetime TIMESTAMPTZ;
  v_submission_id UUID;
  v_log JSONB;
  v_set_index INTEGER := 0;
BEGIN
  -- Validate workout ownership and fetch its original datetime
  SELECT datetime INTO v_workout_datetime
  FROM workouts
  WHERE id = p_workout_id AND user_id = v_user_id;

  IF v_workout_datetime IS NULL THEN
    RAISE EXCEPTION 'Workout not found or does not belong to user';
  END IF;

  -- Base datetime = latest existing set in this workout (fallback to workout start)
  SELECT COALESCE(MAX(datetime), v_workout_datetime)
  INTO v_base_datetime
  FROM sets
  WHERE workout_id = p_workout_id;

  -- Create submission record
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
    p_workout_id,
    p_submission_type,
    p_raw_text,
    p_ai_response,
    p_model_version,
    p_prompt_version,
    p_audio_duration_seconds
  )
  RETURNING id INTO v_submission_id;

  -- Insert sets with incrementing offsets after the last existing set
  FOR v_log IN SELECT * FROM jsonb_array_elements(p_logs) LOOP
    IF (v_log->>'input') IS NULL OR (v_log->>'input') = '' THEN CONTINUE; END IF;
    IF (v_log->>'exercise_kind') IS NULL OR (v_log->>'exercise_kind') = '' THEN CONTINUE; END IF;

    v_set_index := v_set_index + 1;

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
      p_workout_id,
      v_submission_id,
      v_log->>'input',
      v_log->>'exercise_kind',
      COALESCE((v_log->>'modifiers')::jsonb, '[]'::jsonb),
      v_log->>'equipment',
      v_base_datetime + (v_set_index || ' seconds')::interval,
      (v_log->>'weight')::numeric,
      v_log->>'weight_unit',
      (v_log->>'repetitions')::integer,
      v_log->>'duration',
      v_log->>'effort',
      (v_log->>'distance')::numeric,
      v_log->>'distance_unit',
      (v_log->>'resistance_level')::integer
    );
  END LOOP;

  -- Do NOT update ended_at — preserve the past workout's displayed duration

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_submission_to_workout TO authenticated;

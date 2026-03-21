-- Remove COALESCE crutches — unit defaulting is the edge function's responsibility.
-- These recreations drop the COALESCE so the NOT NULL constraint will catch any
-- future bug where the edge function fails to send a unit.

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
  v_user_id      UUID := auth.uid();
  v_workout_id   UUID;
  v_submission_id UUID;
  v_set_id       UUID;
  v_log          JSONB;
  v_last_set_time TIMESTAMPTZ;
BEGIN
  -- Find an existing workout within the last hour
  SELECT w.id INTO v_workout_id
  FROM workouts w
  INNER JOIN sets s ON s.workout_id = w.id
  WHERE w.user_id = v_user_id
  GROUP BY w.id
  HAVING MAX(s.datetime) > NOW() - interval '1 hour'
  ORDER BY MAX(s.datetime) DESC
  LIMIT 1;

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
      COALESCE(v_log->>'weight_unit', 'lbs'),
      (v_log->>'repetitions')::integer,
      v_log->>'duration',
      v_log->>'effort',
      (v_log->>'distance')::numeric,
      COALESCE(v_log->>'distance_unit', 'miles'),
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
  v_user_id         UUID := auth.uid();
  v_workout_datetime TIMESTAMPTZ;
  v_base_datetime   TIMESTAMPTZ;
  v_submission_id   UUID;
  v_log             JSONB;
  v_set_index       INTEGER := 0;
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
      COALESCE(v_log->>'weight_unit', 'lbs'),
      (v_log->>'repetitions')::integer,
      v_log->>'duration',
      v_log->>'effort',
      (v_log->>'distance')::numeric,
      COALESCE(v_log->>'distance_unit', 'miles'),
      (v_log->>'resistance_level')::integer
    );
  END LOOP;

  -- Do NOT update ended_at — preserve the past workout's displayed duration

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_submission_to_workout TO authenticated;


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
  v_set_id    UUID;
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
    COALESCE(p_weight_unit, 'lbs'),
    p_repetitions,
    p_duration,
    p_effort,
    p_distance,
    COALESCE(p_distance_unit, 'miles'),
    p_resistance_level
  )
  RETURNING id INTO v_set_id;

  RETURN v_set_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_set TO authenticated;

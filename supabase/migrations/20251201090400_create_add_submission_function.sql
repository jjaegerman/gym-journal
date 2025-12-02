-- Create add_submission function to store raw transcriptions/text as source of truth
-- This function finds or creates a workout and creates a submission record

CREATE OR REPLACE FUNCTION add_submission(
  p_raw_text TEXT,
  p_submission_type TEXT,
  p_ai_response JSONB,
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
BEGIN
  -- Find most recent workout where last log was within 1 hour
  -- This implements gap-based workout grouping
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

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_submission TO authenticated;

COMMENT ON FUNCTION add_submission IS
  'Creates a workout submission (source of truth) and finds/creates associated workout';

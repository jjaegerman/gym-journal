-- Update add_log function to work with new event-sourcing schema
-- Now requires submission_id and stores exercise data directly in logs

-- Drop old function signatures
DROP FUNCTION IF EXISTS add_log(text, text, text, numeric, text, integer, integer, text, numeric, text, integer);
DROP FUNCTION IF EXISTS add_log(text, numeric, text, integer, integer, text);

-- Create new add_log function
CREATE OR REPLACE FUNCTION add_log(
  p_submission_id UUID,
  p_exercise_variant TEXT,
  p_exercise_type TEXT DEFAULT NULL,
  p_equipment TEXT DEFAULT NULL,
  p_weight NUMERIC DEFAULT NULL,
  p_weight_unit TEXT DEFAULT NULL,
  p_repetitions INTEGER DEFAULT NULL,
  p_duration INTEGER DEFAULT NULL,
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

  -- Insert log directly (no intermediate exercises table)
  INSERT INTO logs (
    workout_id,
    submission_id,
    exercise_type,
    exercise_variant,
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
    p_submission_id,
    p_exercise_type,
    p_exercise_variant,
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
  'Creates a log (derived from submission) and stores exercise data directly';

-- Update RPC functions to work with new exercise schema
-- Changes add_log and get_workout_details to handle variants array and exercise_name

-- Drop old add_log function
DROP FUNCTION IF EXISTS add_log(uuid, text, text, text, numeric, text, integer, integer, text, numeric, text, integer);

-- Create new add_log function with updated parameters
CREATE OR REPLACE FUNCTION add_log(
  p_submission_id UUID,
  p_exercise_variants JSONB DEFAULT '[]'::jsonb,
  p_exercise_type TEXT DEFAULT NULL,
  p_exercise_name TEXT DEFAULT NULL,
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
    p_submission_id,
    p_exercise_type,
    p_exercise_variants,
    p_exercise_name,
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
  'Creates a log (derived from submission) with exercise variants array and optional exercise name';

-- Drop old get_workout_details function
DROP FUNCTION IF EXISTS get_workout_details(uuid);

-- Create new get_workout_details function with updated structure
CREATE OR REPLACE FUNCTION get_workout_details(p_workout_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Build same structure as before, using new schema
  SELECT jsonb_build_object(
    'id', w.id,
    'datetime', w.datetime,
    'exercises', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gen_random_uuid(),  -- Generate ID for frontend compatibility
            'variants', we.variants,
            'type', we.type,
            'equipment', we.equipment,
            'name', we.name,
            'logs', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', l.id,
                  'datetime', l.datetime,
                  'weight', l.weight,
                  'weightUnit', l.weight_unit,
                  'repetitions', l.repetitions,
                  'distance', l.distance,
                  'distanceUnit', l.distance_unit,
                  'resistanceLevel', l.resistance_level,
                  'duration', l.duration,
                  'effort', l.effort
                )
                ORDER BY l.datetime
              ), '[]'::jsonb)
              FROM logs l
              WHERE l.workout_id = w.id
                AND l.exercise_type = we.type
                AND COALESCE(l.exercise_variants, '[]'::jsonb) = COALESCE(we.variants, '[]'::jsonb)
                AND COALESCE(l.exercise_equipment, '') = COALESCE(we.equipment, '')
                AND COALESCE(l.exercise_name, '') = COALESCE(we.name, '')
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
  'Returns workout with exercises (grouped by variants, equipment, type, name) and logs';

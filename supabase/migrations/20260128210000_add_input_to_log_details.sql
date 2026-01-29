-- Add 'input' field to log objects returned by get_workout_details
-- This allows the frontend to display the raw spoken input for each log

DROP FUNCTION IF EXISTS get_workout_details(uuid);

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
            'category', we.category,
            'modifiers', we.modifiers,
            'equipment', we.equipment,
            'logs', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', l.id,
                  'input', l.input,
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
  'Returns workout with exercises and logs including raw input field';

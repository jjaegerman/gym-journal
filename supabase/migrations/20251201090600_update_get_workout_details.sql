-- Update get_workout_details to work with new schema (exercises view instead of table)
-- Maintains same return structure for frontend compatibility

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
  -- Build same structure as before, using new schema
  SELECT jsonb_build_object(
    'id', w.id,
    'datetime', w.datetime,
    'exercises', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gen_random_uuid(),  -- Generate ID for frontend compatibility
            'variant', we.variant,
            'type', we.type,
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
                AND COALESCE(l.exercise_variant, '') = COALESCE(we.variant, '')
                AND COALESCE(l.exercise_equipment, '') = COALESCE(we.equipment, '')
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
  'Returns workout with exercises (from view) and logs - maintains frontend compatibility';

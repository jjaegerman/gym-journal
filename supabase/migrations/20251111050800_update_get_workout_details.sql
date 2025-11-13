-- Update get_workout_details to return type, variant, equipment, and cardio fields
DROP FUNCTION IF EXISTS get_workout_details(uuid);

CREATE OR REPLACE FUNCTION get_workout_details(p_workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', w.id,
    'datetime', w.datetime,
    'exercises', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'variant', e.variant,
          'type', e.type,
          'equipment', e.equipment,
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
            WHERE l.exercise_id = e.id
          )
        )
        ORDER BY e.datetime
      ), '[]'::jsonb
    )
  )
  INTO v_result
  FROM workouts w
  LEFT JOIN exercises e ON e.workout_id = w.id
  WHERE w.id = p_workout_id
  GROUP BY w.id;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_workout_details(uuid) TO authenticated;

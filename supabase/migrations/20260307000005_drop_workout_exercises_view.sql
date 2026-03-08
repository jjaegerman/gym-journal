-- Drop workout_exercises VIEW and inline the grouping as a CTE inside get_workout_details.
-- The VIEW computed 8 aggregates (max_weight, total_volume, etc.) that get_workout_details never read.
-- Only the grouping key (exercise_kind, modifiers, equipment) + MIN(datetime) for ordering are needed.

DROP VIEW IF EXISTS workout_exercises;

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
    'endTime', (
      SELECT MAX(s2.datetime + (
        COALESCE(parse_iso8601_duration_to_seconds(s2.duration), 300) || ' seconds'
      )::interval)
      FROM sets s2
      WHERE s2.workout_id = w.id
    ),
    'exercises', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', gen_random_uuid(),
            'exercise_kind', eg.exercise_kind,
            'modifiers', eg.modifiers,
            'equipment', eg.equipment,
            'sets', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'id', s.id,
                  'input', s.input,
                  'datetime', s.datetime,
                  'weight', s.weight,
                  'weightUnit', s.weight_unit,
                  'repetitions', s.repetitions,
                  'distance', s.distance,
                  'distanceUnit', s.distance_unit,
                  'resistanceLevel', s.resistance_level,
                  'duration', s.duration,
                  'effort', s.effort
                )
                ORDER BY s.datetime
              ), '[]'::jsonb)
              FROM sets s
              WHERE s.workout_id = w.id
                AND s.exercise_kind = eg.exercise_kind
                AND COALESCE(s.modifiers, '[]'::jsonb) = eg.modifiers
                AND COALESCE(s.equipment, '') = COALESCE(eg.equipment, '')
            )
          )
          ORDER BY eg.datetime
        )
        FROM (
          SELECT
            exercise_kind,
            COALESCE(modifiers, '[]'::jsonb) AS modifiers,
            equipment,
            MIN(datetime) AS datetime
          FROM sets
          WHERE workout_id = w.id
            AND exercise_kind IS NOT NULL
          GROUP BY exercise_kind, modifiers, equipment
        ) eg
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

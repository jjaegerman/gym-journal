-- Secure workout functions to use auth.uid() instead of accepting user_id parameter
-- Also ensure get_workout_details validates ownership

DROP FUNCTION IF EXISTS public.get_user_workouts(uuid);

-- Remove p_user_id parameter - always use auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_workouts()
RETURNS TABLE(
  id uuid,
  datetime timestamp with time zone,
  "exerciseCount" bigint,
  "logCount" bigint,
  "mostRecentLog" timestamp with time zone,
  "exercisePreview" jsonb,
  "totalVolume" numeric,
  "totalDistance" numeric,
  "distanceUnit" text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.datetime,
    COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL), 0) as "exerciseCount",
    COALESCE(COUNT(l.id), 0) as "logCount",
    COALESCE(MAX(l.datetime), w.datetime) as "mostRecentLog",

    -- Exercise preview: top 3 exercise types/names as JSON array
    (
      SELECT COALESCE(
        jsonb_agg(exercise_name),
        '[]'::jsonb
      )
      FROM (
        SELECT COALESCE(e.type, e.variant) as exercise_name
        FROM exercises e
        WHERE e.workout_id = w.id
        GROUP BY COALESCE(e.type, e.variant)
        ORDER BY MIN(e.datetime)
        LIMIT 3
      ) e2
    ) as "exercisePreview",

    -- Total volume (weight * reps summed)
    COALESCE(
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0))
      FILTER (WHERE l.weight IS NOT NULL AND l.repetitions IS NOT NULL),
      0
    ) as "totalVolume",

    -- Total distance (sum of all distance logs)
    COALESCE(
      SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL),
      0
    ) as "totalDistance",

    -- Distance unit (use the most common one in the workout)
    (
      SELECT l2.distance_unit
      FROM logs l2
      JOIN exercises e2 ON e2.id = l2.exercise_id
      WHERE e2.workout_id = w.id AND l2.distance_unit IS NOT NULL
      GROUP BY l2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit"

  FROM workouts w
  LEFT JOIN exercises e ON e.workout_id = w.id
  LEFT JOIN logs l ON l.exercise_id = e.id
  WHERE w.user_id = auth.uid()  -- Always use authenticated user's ID
  GROUP BY w.id, w.datetime
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workouts() TO authenticated;

DROP FUNCTION IF EXISTS public.get_workout_details(uuid);

-- Add user_id check to ensure workout belongs to authenticated user
CREATE OR REPLACE FUNCTION public.get_workout_details(p_workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    AND w.user_id = auth.uid()  -- Ensure workout belongs to authenticated user
  GROUP BY w.id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workout_details(uuid) TO authenticated;

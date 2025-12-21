-- Fix get_user_workouts to handle JSONB arrays safely

DROP FUNCTION IF EXISTS public.get_user_workouts();

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

    -- Count distinct exercises (grouped by variants, equipment, type, name)
    COUNT(DISTINCT (COALESCE(l.exercise_variants, '[]'::jsonb)::text, l.exercise_equipment, l.exercise_type, l.exercise_name))
      FILTER (WHERE l.exercise_type IS NOT NULL) as "exerciseCount",

    -- Count total logs
    COALESCE(COUNT(l.id), 0) as "logCount",

    -- Most recent log time
    COALESCE(MAX(l.datetime), w.datetime) as "mostRecentLog",

    -- Exercise preview: top 3 exercises as formatted strings
    (
      SELECT COALESCE(
        jsonb_agg(exercise_display),
        '[]'::jsonb
      )
      FROM (
        SELECT
          -- Format exercise name for display
          CASE
            WHEN l2.exercise_name IS NOT NULL THEN
              -- Use exercise_name for "Other" categories
              TRIM(CONCAT_WS(' ',
                NULLIF(array_to_string(
                  (SELECT array_agg(elem ORDER BY elem)
                   FROM jsonb_array_elements_text(COALESCE(l2.exercise_variants, '[]'::jsonb)) elem),
                  ' '
                ), ''),
                l2.exercise_equipment,
                l2.exercise_name
              ))
            ELSE
              -- Standard exercises: {variants} {equipment} {type}
              TRIM(CONCAT_WS(' ',
                NULLIF(array_to_string(
                  (SELECT array_agg(elem ORDER BY elem)
                   FROM jsonb_array_elements_text(COALESCE(l2.exercise_variants, '[]'::jsonb)) elem),
                  ' '
                ), ''),
                l2.exercise_equipment,
                l2.exercise_type
              ))
          END as exercise_display
        FROM logs l2
        WHERE l2.workout_id = w.id
        GROUP BY l2.exercise_type, l2.exercise_variants, l2.exercise_equipment, l2.exercise_name
        ORDER BY MIN(l2.datetime)
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
      WHERE l2.workout_id = w.id AND l2.distance_unit IS NOT NULL
      GROUP BY l2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit"

  FROM workouts w
  LEFT JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id, w.datetime
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workouts() TO authenticated;

COMMENT ON FUNCTION public.get_user_workouts IS
  'Returns all workouts for authenticated user with formatted exercise previews using new schema';

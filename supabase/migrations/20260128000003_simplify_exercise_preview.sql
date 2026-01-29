-- Simplify exercisePreview to show only distinct exercise categories
-- No modifiers, no equipment, no duplicates

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

    -- Count distinct exercises (grouped by input, category, modifiers, equipment)
    COUNT(DISTINCT (l.input, l.category, l.modifiers::text, l.equipment))
      FILTER (WHERE l.category IS NOT NULL) as "exerciseCount",

    -- Count total logs
    COALESCE(COUNT(l.id), 0) as "logCount",

    -- Most recent log time
    COALESCE(MAX(l.datetime), w.datetime) as "mostRecentLog",

    -- Exercise preview: top 3 distinct categories only
    (
      SELECT COALESCE(
        jsonb_agg(category),
        '[]'::jsonb
      )
      FROM (
        SELECT DISTINCT l2.category
        FROM logs l2
        WHERE l2.workout_id = w.id
          AND l2.category IS NOT NULL
        ORDER BY l2.category
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

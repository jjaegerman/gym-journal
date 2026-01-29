-- Fix exercise grouping to NOT include input field
-- Group by {category, modifiers, equipment} only so all squats are together

-- Update workout_exercises view
DROP VIEW IF EXISTS workout_exercises;

CREATE OR REPLACE VIEW workout_exercises AS
SELECT
  l.workout_id,
  l.category,
  COALESCE(l.modifiers, '[]'::jsonb) as modifiers,
  l.equipment,

  -- Aggregated metrics
  COUNT(*) as total_sets,
  MAX(l.weight) as max_weight,
  MAX(l.repetitions) as max_reps,
  AVG(l.weight) FILTER (WHERE l.weight IS NOT NULL) as avg_weight,
  SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0)) as total_volume,
  SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL) as total_distance,

  -- Timestamps
  MIN(l.datetime) as first_logged,
  MAX(l.datetime) as last_logged,
  MIN(l.datetime) as datetime
FROM logs l
WHERE l.category IS NOT NULL
GROUP BY
  l.workout_id,
  l.category,
  l.modifiers,
  l.equipment;

GRANT SELECT ON workout_exercises TO authenticated;

-- Update get_workout_details function
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

-- Update get_user_workouts to match grouping
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

    -- Count distinct exercises (grouped by category, modifiers, equipment)
    COUNT(DISTINCT (l.category, l.modifiers::text, l.equipment))
      FILTER (WHERE l.category IS NOT NULL) as "exerciseCount",

    -- Count total logs
    COALESCE(COUNT(l.id), 0) as "logCount",

    -- Most recent log time
    COALESCE(MAX(l.datetime), w.datetime) as "mostRecentLog",

    -- Exercise preview: top 3 distinct categories only
    (
      SELECT COALESCE(jsonb_agg(category), '[]'::jsonb)
      FROM (
        SELECT DISTINCT l2.category
        FROM logs l2
        WHERE l2.workout_id = w.id AND l2.category IS NOT NULL
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
    COALESCE(SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL), 0) as "totalDistance",

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

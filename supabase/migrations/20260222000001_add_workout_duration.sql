-- Add server-side workout duration to get_user_workouts and endTime to get_workout_details
-- Each log's end time = log.datetime + duration (or 5 min default)
-- Workout duration = MAX(end_time) - workout.datetime

-- get_user_workouts: return type changes, must DROP first
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
  "distanceUnit" text,
  "durationMinutes" integer
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
    ) as "distanceUnit",

    -- Duration in minutes: MAX(log end time) - workout start
    -- Each log's end time = datetime + parsed duration (or 5 min default)
    COALESCE(
      EXTRACT(EPOCH FROM (
        MAX(l.datetime + (
          COALESCE(parse_iso8601_duration_to_seconds(l.duration), 300) || ' seconds'
        )::interval) - w.datetime
      )) / 60,
      0
    )::integer as "durationMinutes"

  FROM workouts w
  LEFT JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id, w.datetime
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workouts() TO authenticated;

-- get_workout_details: add endTime field to JSONB response
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
      SELECT MAX(l2.datetime + (
        COALESCE(parse_iso8601_duration_to_seconds(l2.duration), 300) || ' seconds'
      )::interval)
      FROM logs l2
      WHERE l2.workout_id = w.id
    ),
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

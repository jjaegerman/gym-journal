-- Handle empty workouts: auto-delete when last log removed + filter from listing

-- 1. Update delete_log to clean up empty workouts
DROP FUNCTION IF EXISTS delete_log(uuid);

CREATE OR REPLACE FUNCTION delete_log(p_log_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workout_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the workout_id before deleting
  SELECT l.workout_id INTO v_workout_id
  FROM logs l
  JOIN workouts w ON w.id = l.workout_id
  WHERE l.id = p_log_id AND w.user_id = v_user_id;

  IF v_workout_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Delete the log
  DELETE FROM logs WHERE id = p_log_id;

  -- If workout now has 0 logs, delete it too
  IF NOT EXISTS (SELECT 1 FROM logs WHERE workout_id = v_workout_id) THEN
    DELETE FROM workouts WHERE id = v_workout_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_log(uuid) TO authenticated;

-- 2. Update get_user_workouts to use INNER JOIN (defense-in-depth)
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

    COUNT(DISTINCT (l.category, l.modifiers::text, l.equipment))
      FILTER (WHERE l.category IS NOT NULL) as "exerciseCount",

    COUNT(l.id) as "logCount",

    COALESCE(MAX(l.datetime), w.datetime) as "mostRecentLog",

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

    COALESCE(
      SUM(COALESCE(l.weight, 0) * COALESCE(l.repetitions, 0))
      FILTER (WHERE l.weight IS NOT NULL AND l.repetitions IS NOT NULL),
      0
    ) as "totalVolume",

    COALESCE(SUM(l.distance) FILTER (WHERE l.distance IS NOT NULL), 0) as "totalDistance",

    (
      SELECT l2.distance_unit
      FROM logs l2
      WHERE l2.workout_id = w.id AND l2.distance_unit IS NOT NULL
      GROUP BY l2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit",

    COALESCE(
      EXTRACT(EPOCH FROM (
        MAX(l.datetime + (
          COALESCE(parse_iso8601_duration_to_seconds(l.duration), 300) || ' seconds'
        )::interval) - w.datetime
      )) / 60,
      0
    )::integer as "durationMinutes"

  FROM workouts w
  INNER JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
  GROUP BY w.id, w.datetime
  HAVING COUNT(l.id) > 0
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workouts() TO authenticated;

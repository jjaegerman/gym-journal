-- Add p_limit parameter to filter_user_workouts for cursor-based pagination
-- Signature change requires DROP first

DROP FUNCTION IF EXISTS filter_user_workouts(text[], text[], timestamptz, timestamptz, boolean);

CREATE OR REPLACE FUNCTION filter_user_workouts(
  p_exercise_kinds text[] DEFAULT NULL,
  p_equipment text[] DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_ascending boolean DEFAULT false,
  p_limit int DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  datetime timestamp with time zone,
  "exerciseCount" bigint,
  "setCount" bigint,
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

    COUNT(DISTINCT (s.exercise_kind, s.modifiers::text, s.equipment))
      FILTER (WHERE s.exercise_kind IS NOT NULL) as "exerciseCount",

    COALESCE(COUNT(s.id), 0) as "setCount",

    COALESCE(MAX(s.datetime), w.datetime) as "mostRecentLog",

    (
      SELECT COALESCE(jsonb_agg(exercise_kind), '[]'::jsonb)
      FROM (
        SELECT DISTINCT s2.exercise_kind
        FROM sets s2
        WHERE s2.workout_id = w.id
          AND s2.exercise_kind IS NOT NULL
          AND (p_exercise_kinds IS NULL OR s2.exercise_kind = ANY(p_exercise_kinds))
          AND (p_equipment IS NULL OR s2.equipment = ANY(p_equipment))
        ORDER BY s2.exercise_kind
        LIMIT 3
      ) e2
    ) as "exercisePreview",

    COALESCE(
      SUM(COALESCE(s.weight, 0) * COALESCE(s.repetitions, 0))
      FILTER (WHERE s.weight IS NOT NULL AND s.repetitions IS NOT NULL),
      0
    ) as "totalVolume",

    COALESCE(SUM(s.distance) FILTER (WHERE s.distance IS NOT NULL), 0) as "totalDistance",

    (
      SELECT s2.distance_unit
      FROM sets s2
      WHERE s2.workout_id = w.id AND s2.distance_unit IS NOT NULL
      GROUP BY s2.distance_unit
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as "distanceUnit",

    COALESCE(
      EXTRACT(EPOCH FROM (
        MAX(s.datetime + (
          COALESCE(parse_iso8601_duration_to_seconds(s.duration), 300) || ' seconds'
        )::interval) - w.datetime
      )) / 60,
      0
    )::integer as "durationMinutes"

  FROM workouts w
  INNER JOIN sets s ON s.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND (p_exercise_kinds IS NULL OR s.exercise_kind = ANY(p_exercise_kinds))
    AND (p_equipment IS NULL OR s.equipment = ANY(p_equipment))
    AND (p_date_from IS NULL OR w.datetime >= p_date_from)
    AND (p_date_to IS NULL OR w.datetime <= p_date_to)
  GROUP BY w.id, w.datetime
  HAVING COUNT(s.id) > 0
  ORDER BY
    CASE WHEN p_ascending THEN w.datetime END ASC NULLS LAST,
    CASE WHEN NOT p_ascending THEN w.datetime END DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION filter_user_workouts(text[], text[], timestamptz, timestamptz, boolean, int) TO authenticated;

-- History tab: pagination + sort order + month picker
-- Adds get_workout_months(), rebuilds get_user_workouts with pagination/sort,
-- rebuilds filter_user_workouts with sort order.

-- ============================================================
-- 1. get_workout_months: year/month pairs with workout counts
-- ============================================================
CREATE OR REPLACE FUNCTION get_workout_months()
RETURNS TABLE(year int, month int, workout_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(YEAR FROM w.datetime)::int AS year,
    EXTRACT(MONTH FROM w.datetime)::int AS month,
    COUNT(DISTINCT w.id) AS workout_count
  FROM workouts w
  INNER JOIN sets s ON s.workout_id = w.id
  WHERE w.user_id = auth.uid()
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workout_months() TO authenticated;

-- ============================================================
-- 2. get_user_workouts: add pagination + sort order
-- Signature change requires DROP first
-- ============================================================
DROP FUNCTION IF EXISTS get_user_workouts();

CREATE OR REPLACE FUNCTION get_user_workouts(
  p_limit int DEFAULT NULL,
  p_offset int DEFAULT 0,
  p_ascending boolean DEFAULT false
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

    COUNT(s.id) as "setCount",

    COALESCE(MAX(s.datetime), w.datetime) as "mostRecentLog",

    (
      SELECT COALESCE(jsonb_agg(exercise_kind), '[]'::jsonb)
      FROM (
        SELECT DISTINCT s2.exercise_kind
        FROM sets s2
        WHERE s2.workout_id = w.id AND s2.exercise_kind IS NOT NULL
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
  GROUP BY w.id, w.datetime
  HAVING COUNT(s.id) > 0
  ORDER BY
    CASE WHEN p_ascending THEN w.datetime END ASC NULLS LAST,
    CASE WHEN NOT p_ascending THEN w.datetime END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_workouts(int, int, boolean) TO authenticated;

-- ============================================================
-- 3. filter_user_workouts: add sort order parameter
-- Signature change requires DROP first
-- ============================================================
DROP FUNCTION IF EXISTS filter_user_workouts(text[], text[], timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION filter_user_workouts(
  p_exercise_kinds text[] DEFAULT NULL,
  p_equipment text[] DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_ascending boolean DEFAULT false
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
    CASE WHEN NOT p_ascending THEN w.datetime END DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION filter_user_workouts(text[], text[], timestamptz, timestamptz, boolean) TO authenticated;

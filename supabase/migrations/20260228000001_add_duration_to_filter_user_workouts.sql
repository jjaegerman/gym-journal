-- filter_user_workouts was missing durationMinutes added in 20260222000001
-- Return type changes require DROP + recreate

DROP FUNCTION IF EXISTS filter_user_workouts(text[], text[], timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION filter_user_workouts(
  p_categories text[] DEFAULT NULL,
  p_equipment text[] DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
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

    -- Exercise preview: top 3 distinct categories only (filtered)
    (
      SELECT COALESCE(jsonb_agg(category), '[]'::jsonb)
      FROM (
        SELECT DISTINCT l2.category
        FROM logs l2
        WHERE l2.workout_id = w.id
          AND l2.category IS NOT NULL
          AND (p_categories IS NULL OR l2.category = ANY(p_categories))
          AND (p_equipment IS NULL OR l2.equipment = ANY(p_equipment))
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
    AND (p_categories IS NULL OR l.category = ANY(p_categories))
    AND (p_equipment IS NULL OR l.equipment = ANY(p_equipment))
    AND (p_date_from IS NULL OR w.datetime >= p_date_from)
    AND (p_date_to IS NULL OR w.datetime <= p_date_to)
  GROUP BY w.id, w.datetime
  HAVING COUNT(l.id) > 0
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION filter_user_workouts(text[], text[], timestamptz, timestamptz) TO authenticated;

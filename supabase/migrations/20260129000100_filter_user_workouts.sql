-- RPC to return filtered workouts for current user

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
        WHERE l2.workout_id = w.id
          AND l2.category IS NOT NULL
          -- Apply same filters to preview
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
    ) as "distanceUnit"

  FROM workouts w
  INNER JOIN logs l ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
    -- Apply filters to logs
    AND (p_categories IS NULL OR l.category = ANY(p_categories))
    AND (p_equipment IS NULL OR l.equipment = ANY(p_equipment))
    -- Apply date filter to workout
    AND (p_date_from IS NULL OR w.datetime >= p_date_from)
    AND (p_date_to IS NULL OR w.datetime <= p_date_to)
  GROUP BY w.id, w.datetime
  -- Only return workouts that have matching logs
  HAVING COUNT(l.id) > 0
  ORDER BY w.datetime DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION filter_user_workouts(text[], text[], timestamptz, timestamptz) TO authenticated;

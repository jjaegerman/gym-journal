-- Update get_user_workouts to include exercise previews and summary stats
DROP FUNCTION IF EXISTS get_user_workouts(uuid);

CREATE OR REPLACE FUNCTION get_user_workouts(p_user_id uuid)
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
) AS $$
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
  WHERE w.user_id = p_user_id
  GROUP BY w.id, w.datetime
  ORDER BY w.datetime DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_workouts(uuid) TO authenticated;

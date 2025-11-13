-- Fix get_user_workouts to handle NULL values properly
-- Replaces the function to avoid NaN errors from empty workouts

DROP FUNCTION IF EXISTS get_user_workouts(uuid);

CREATE OR REPLACE FUNCTION get_user_workouts(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  datetime timestamp with time zone,
  exerciseCount bigint,
  logCount bigint,
  mostRecentLog timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.datetime,
    COALESCE(COUNT(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL), 0) as exerciseCount,
    COALESCE(COUNT(l.id), 0) as logCount,
    COALESCE(MAX(l.datetime), w.datetime) as mostRecentLog
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

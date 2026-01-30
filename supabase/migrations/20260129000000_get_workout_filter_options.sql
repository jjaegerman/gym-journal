-- RPC to return available filter values for current user's workouts

CREATE OR REPLACE FUNCTION get_workout_filter_options()
RETURNS TABLE(
  categories jsonb,
  equipment jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Distinct categories used by user
    COALESCE(
      (SELECT jsonb_agg(DISTINCT l.category ORDER BY l.category)
       FROM logs l
       INNER JOIN workouts w ON l.workout_id = w.id
       WHERE w.user_id = auth.uid() AND l.category IS NOT NULL),
      '[]'::jsonb
    ) as categories,

    -- Distinct equipment used by user
    COALESCE(
      (SELECT jsonb_agg(DISTINCT l.equipment ORDER BY l.equipment)
       FROM logs l
       INNER JOIN workouts w ON l.workout_id = w.id
       WHERE w.user_id = auth.uid() AND l.equipment IS NOT NULL),
      '[]'::jsonb
    ) as equipment;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workout_filter_options() TO authenticated;

-- RPC to return available filter values for current user's exercises

CREATE OR REPLACE FUNCTION get_exercise_filter_options()
RETURNS TABLE(
  categories jsonb,
  modifiers jsonb,
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
    -- Distinct categories
    COALESCE(
      (SELECT jsonb_agg(DISTINCT l.category ORDER BY l.category)
       FROM logs l
       INNER JOIN workouts w ON l.workout_id = w.id
       WHERE w.user_id = auth.uid() AND l.category IS NOT NULL),
      '[]'::jsonb
    ) as categories,

    -- Distinct modifiers (flatten arrays and dedupe)
    COALESCE(
      (SELECT jsonb_agg(DISTINCT mod ORDER BY mod)
       FROM logs l
       INNER JOIN workouts w ON l.workout_id = w.id
       CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(l.modifiers, '[]'::jsonb)) as mod
       WHERE w.user_id = auth.uid()),
      '[]'::jsonb
    ) as modifiers,

    -- Distinct equipment
    COALESCE(
      (SELECT jsonb_agg(DISTINCT l.equipment ORDER BY l.equipment)
       FROM logs l
       INNER JOIN workouts w ON l.workout_id = w.id
       WHERE w.user_id = auth.uid() AND l.equipment IS NOT NULL),
      '[]'::jsonb
    ) as equipment;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exercise_filter_options() TO authenticated;

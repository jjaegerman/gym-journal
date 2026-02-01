-- Returns all (category, equipment, modifiers) combinations in user's logs
-- Used for client-side filter cascading

CREATE OR REPLACE FUNCTION get_filter_relationships()
RETURNS TABLE(
  category text,
  equipment text,
  modifiers jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    l.category,
    l.equipment,
    COALESCE(l.modifiers, '[]'::jsonb) as modifiers
  FROM logs l
  INNER JOIN workouts w ON l.workout_id = w.id
  WHERE w.user_id = auth.uid()
    AND l.category IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_filter_relationships() TO authenticated;

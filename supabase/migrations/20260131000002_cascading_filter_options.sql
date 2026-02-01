-- Cascading filter options function
-- Returns available filter options based on current filter selections
-- Categories are always shown; equipment/modifiers filter based on selections

CREATE OR REPLACE FUNCTION get_cascaded_filter_options(
  p_categories text[] DEFAULT NULL,
  p_equipment text[] DEFAULT NULL
)
RETURNS TABLE(categories text[], modifiers jsonb, equipment text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_logs AS (
    SELECT l.category, l.modifiers AS log_modifiers, l.equipment AS log_equipment
    FROM logs l
    INNER JOIN workouts w ON l.workout_id = w.id
    WHERE w.user_id = auth.uid()
  ),
  filtered_logs AS (
    SELECT * FROM user_logs
    WHERE (p_categories IS NULL OR category = ANY(p_categories))
      AND (p_equipment IS NULL OR log_equipment = ANY(p_equipment))
  )
  SELECT
    -- Categories: always show all (this is the primary filter)
    (SELECT ARRAY_AGG(DISTINCT category ORDER BY category) FROM user_logs WHERE category IS NOT NULL),
    -- Modifiers: only from logs matching current category/equipment
    (SELECT COALESCE(jsonb_agg(DISTINCT m ORDER BY m), '[]'::jsonb)
     FROM filtered_logs, jsonb_array_elements_text(log_modifiers) m),
    -- Equipment: only from logs matching current category
    (SELECT ARRAY_AGG(DISTINCT log_equipment ORDER BY log_equipment)
     FROM user_logs
     WHERE log_equipment IS NOT NULL
       AND (p_categories IS NULL OR category = ANY(p_categories)));
END;
$$;

GRANT EXECUTE ON FUNCTION get_cascaded_filter_options(text[], text[]) TO authenticated;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_weight_unit TEXT NOT NULL DEFAULT 'lbs',
  ADD COLUMN IF NOT EXISTS preferred_distance_unit TEXT NOT NULL DEFAULT 'miles';

-- Get user's unit preferences
CREATE OR REPLACE FUNCTION get_user_unit_preferences()
RETURNS TABLE(preferred_weight_unit TEXT, preferred_distance_unit TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.preferred_weight_unit, p.preferred_distance_unit
  FROM profiles p
  WHERE p.id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_unit_preferences() TO authenticated;

-- Update user's unit preferences
CREATE OR REPLACE FUNCTION update_user_unit_preferences(
  p_weight_unit TEXT,
  p_distance_unit TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_weight_unit NOT IN ('kg', 'lbs') THEN
    RAISE EXCEPTION 'Invalid weight unit: %. Must be kg or lbs.', p_weight_unit;
  END IF;
  IF p_distance_unit NOT IN ('km', 'miles') THEN
    RAISE EXCEPTION 'Invalid distance unit: %. Must be km or miles.', p_distance_unit;
  END IF;

  UPDATE profiles
  SET
    preferred_weight_unit = p_weight_unit,
    preferred_distance_unit = p_distance_unit,
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_unit_preferences(TEXT, TEXT) TO authenticated;

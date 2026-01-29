-- Fix delete_log to use SECURITY DEFINER (bypasses RLS, does own auth check)
-- This matches the pattern used by other functions in this codebase

DROP FUNCTION IF EXISTS delete_log(uuid);

CREATE OR REPLACE FUNCTION delete_log(p_log_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete only if log belongs to user's workout
  DELETE FROM logs
  WHERE id = p_log_id
    AND workout_id IN (
      SELECT id FROM workouts WHERE user_id = v_user_id
    );

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_log(uuid) TO authenticated;

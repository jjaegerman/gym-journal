-- Deletes all user data in FK-safe order before auth user deletion.
-- sets.workout_id is ON DELETE RESTRICT, so sets must be deleted before workouts.
-- Called from the delete-account edge function using the service role.
CREATE OR REPLACE FUNCTION delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete sets first (ON DELETE RESTRICT prevents workout deletion otherwise)
  DELETE FROM sets
  WHERE workout_id IN (
    SELECT id FROM workouts WHERE user_id = p_user_id
  );

  -- Delete workouts (log_submissions.workout_id is ON DELETE CASCADE, handled automatically)
  DELETE FROM workouts WHERE user_id = p_user_id;

  -- Delete any remaining log_submissions not linked to a workout
  DELETE FROM log_submissions WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO authenticated;

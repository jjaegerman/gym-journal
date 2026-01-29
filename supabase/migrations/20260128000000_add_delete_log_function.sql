-- Drop the old broken policy (references defunct exercises table and exercise_id column)
DROP POLICY IF EXISTS "Users can delete logs only for their exercises" ON logs;

-- Create new DELETE policy using current schema (logs.workout_id)
CREATE POLICY "Users can delete own logs" ON logs
FOR DELETE USING (
  workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid())
);

-- Grant DELETE permission to authenticated users (RLS will filter)
GRANT DELETE ON logs TO authenticated;

-- Simple function using SECURITY INVOKER (RLS handles auth)
CREATE OR REPLACE FUNCTION delete_log(p_log_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM logs WHERE id = p_log_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_log(uuid) TO authenticated;

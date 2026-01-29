-- Drop the old broken DELETE policy that references defunct exercises table
DROP POLICY IF EXISTS "Users can delete logs only for their exercises" ON logs;

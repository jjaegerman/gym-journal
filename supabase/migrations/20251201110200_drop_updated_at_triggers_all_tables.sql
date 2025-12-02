-- Drop set_updated_at triggers from ALL tables

-- Workouts table
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
DROP TRIGGER IF EXISTS set_updated_at ON workouts;

-- Workout submissions table
DROP TRIGGER IF EXISTS update_workout_submissions_updated_at ON workout_submissions;
DROP TRIGGER IF EXISTS set_updated_at ON workout_submissions;

-- Logs table (again, to be sure)
DROP TRIGGER IF EXISTS update_logs_updated_at ON logs;
DROP TRIGGER IF EXISTS set_updated_at ON logs;

-- Drop updated_at columns if they exist but aren't needed
ALTER TABLE logs DROP COLUMN IF EXISTS updated_at;
ALTER TABLE workout_submissions DROP COLUMN IF EXISTS updated_at;

-- Keep updated_at on workouts if it exists (workouts can be updated)
-- ALTER TABLE workouts DROP COLUMN IF EXISTS updated_at;

COMMENT ON TABLE logs IS
  'Exercise logs - immutable records, no updated_at tracking';

COMMENT ON TABLE workout_submissions IS
  'Workout submissions - immutable records, no updated_at tracking';

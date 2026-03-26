-- Change sets.workout_id from ON DELETE RESTRICT to ON DELETE CASCADE
-- so that deleting a workout (or user) automatically cleans up its sets.
ALTER TABLE sets DROP CONSTRAINT sets_workout_id_fkey;
ALTER TABLE sets ADD CONSTRAINT sets_workout_id_fkey
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE;

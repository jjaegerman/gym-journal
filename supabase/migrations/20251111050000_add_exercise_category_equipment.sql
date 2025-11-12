-- Rename name column to variant and add type and equipment columns
ALTER TABLE exercises
RENAME COLUMN name TO variant;

ALTER TABLE exercises
ADD COLUMN type text,
ADD COLUMN equipment text;

-- Create index on type for faster stats queries
CREATE INDEX idx_exercises_type ON exercises(type);

-- Add comments to explain the columns
COMMENT ON COLUMN exercises.type IS 'Exercise type/category (e.g., Squat, Bench Press, Deadlift)';
COMMENT ON COLUMN exercises.variant IS 'Specific exercise variant with all modifiers (e.g., Barbell Back Squat)';
COMMENT ON COLUMN exercises.equipment IS 'Primary equipment used (e.g., Barbell, Dumbbell, Bodyweight)';

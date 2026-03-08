-- Clean up exercise kind / equipment overlap for cardio machines.
-- These equipment values are being retired:
--   Rowing Machine, Elliptical, Stair Climber, Jump Rope (exact overlap with ExerciseKind)
--   Stationary Bike (moving to ExerciseKind, replacing Cycling + Stationary Bike equipment combo)
--
-- Order matters: reclassify before nulling.

-- Step 1: Re-classify indoor cycling sets → Stationary Bike exercise kind
UPDATE sets
SET exercise_kind = 'Stationary Bike'
WHERE exercise_kind = 'Cycling'
  AND equipment = 'Stationary Bike';

-- Step 2: NULL out equipment for values that are now only ExerciseKinds
UPDATE sets
SET equipment = NULL
WHERE equipment IN ('Rowing Machine', 'Elliptical', 'Stair Climber', 'Jump Rope', 'Stationary Bike');

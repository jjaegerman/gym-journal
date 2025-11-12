-- Add cardio-related fields to logs table
ALTER TABLE logs
ADD COLUMN distance numeric,
ADD COLUMN distance_unit text,
ADD COLUMN resistance_level integer;

-- Add comments to explain the columns
COMMENT ON COLUMN logs.distance IS 'Distance covered (for cardio exercises)';
COMMENT ON COLUMN logs.distance_unit IS 'Unit of distance (miles, km, meters)';
COMMENT ON COLUMN logs.resistance_level IS 'Resistance/incline/damper level (for cardio equipment)';

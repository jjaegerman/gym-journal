-- Update workouts table to add stable timestamp columns
-- These provide stable identifiers for workouts even if grouping logic changes

-- Drop all existing workouts (fresh start - no users yet)
TRUNCATE workouts CASCADE;

-- Add stable timestamp columns
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add unique constraint for stable identification
-- A workout is uniquely identified by (user_id, started_at)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_user_started
  ON workouts(user_id, started_at);

-- Documentation
COMMENT ON COLUMN workouts.started_at IS
  'First log timestamp in this workout - stable identifier';

COMMENT ON COLUMN workouts.ended_at IS
  'Last log timestamp in this workout - updated as logs are added';

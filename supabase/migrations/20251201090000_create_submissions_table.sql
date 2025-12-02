-- Create workout_submissions table as source of truth
-- This table stores the immutable raw transcriptions/text that all logs are derived from

CREATE TABLE IF NOT EXISTS workout_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,

  -- Source of truth: raw input
  submission_type TEXT NOT NULL CHECK (submission_type IN ('audio', 'text')),
  raw_text TEXT NOT NULL,

  -- AI metadata (for debugging/reprocessing)
  ai_response JSONB,  -- Full OpenAI structured output
  model_version TEXT DEFAULT 'gpt-4.1',
  prompt_version TEXT DEFAULT 'v1.0',

  -- Audio metadata (optional)
  audio_duration_seconds INTEGER,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_user_created
  ON workout_submissions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_workout
  ON workout_submissions(workout_id);

-- Enable RLS
ALTER TABLE workout_submissions ENABLE ROW LEVEL SECURITY;

-- No direct access - only via functions
REVOKE ALL ON workout_submissions FROM authenticated, anon;

-- Documentation
COMMENT ON TABLE workout_submissions IS
  'Source of truth: raw transcriptions/text input. All exercises and logs are derived from these submissions.';

COMMENT ON COLUMN workout_submissions.raw_text IS
  'Original transcription or user input - immutable source of truth';

COMMENT ON COLUMN workout_submissions.ai_response IS
  'Full OpenAI response for debugging and reprocessing';

COMMENT ON COLUMN workout_submissions.prompt_version IS
  'Track prompt changes to enable reprocessing with new prompts';

-- Drop get_exercise_stats RPC — superseded by get_filtered_exercise_stats.
-- Frontend code (useExerciseStats, ExerciseStatsCard) also deleted alongside this.
DROP FUNCTION IF EXISTS get_exercise_stats();

-- Drop all overloads of get_filtered_exercise_stats to resolve ambiguity
DROP FUNCTION IF EXISTS get_filtered_exercise_stats(text[], jsonb, text[], text);
DROP FUNCTION IF EXISTS get_filtered_exercise_stats(text[], text[], text[], text);

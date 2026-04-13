import { supabase } from "./client";
import {
  ExerciseFilters,
  EMPTY_FILTERED_EXERCISE_STATS,
  FilteredExerciseStats,
  mapFilteredStatsRow,
} from "./stats";
import { WorkoutDetails } from "@/types/exercise";

/**
 * Public (unauthenticated) read wrappers.
 *
 * These call the `get_public_*` RPCs, which are SECURITY DEFINER and granted
 * to the `anon` role. They power the /share/* routes — anyone with a workout
 * UUID or a user_id can read via these without a session.
 */

/**
 * Fetch workout details by UUID with no auth check. Used by /share/workout/[id].
 */
export async function getPublicWorkoutDetails(workoutId: string) {
  const { data, error } = await supabase.rpc("get_public_workout_details", {
    p_workout_id: workoutId,
  });

  if (error) {
    console.error("Error fetching public workout details:", error);
    throw error;
  }

  return data as WorkoutDetails;
}

/**
 * Fetch filtered exercise stats for a specific user with no auth check.
 * Used by /share/stats. All filter / unit preferences come from the URL.
 */
export async function getPublicFilteredExerciseStats(
  userId: string,
  filters?: ExerciseFilters
): Promise<FilteredExerciseStats> {
  const { data, error } = await supabase.rpc(
    "get_public_filtered_exercise_stats",
    {
      p_user_id: userId,
      p_exercise_kinds: filters?.exercise_kinds?.length
        ? filters.exercise_kinds
        : null,
      p_modifiers: filters?.modifiers?.length ? filters.modifiers : null,
      p_equipment: filters?.equipment?.length ? filters.equipment : null,
      p_time_range: filters?.timeRange ?? "all_time",
      p_preferred_weight_unit: filters?.preferredWeightUnit ?? "lbs",
      p_preferred_distance_unit: filters?.preferredDistanceUnit ?? "miles",
    }
  );

  if (error) {
    console.error("Error fetching public filtered exercise stats:", error);
    throw error;
  }

  const row = data?.[0];
  if (!row) return EMPTY_FILTERED_EXERCISE_STATS;
  return mapFilteredStatsRow(row);
}

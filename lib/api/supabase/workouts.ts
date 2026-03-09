import { supabase } from './client';
import { Workout, WorkoutDetails } from '@/types/exercise';

/**
 * Workouts API
 * All workout-related database operations
 */

export interface WorkoutFilterOptions {
  exercise_kinds: string[];
  equipment: string[];
}

export interface WorkoutFilterRelationship {
  exercise_kind: string;
  equipment: string | null;
}

export interface WorkoutFilters {
  exercise_kinds?: string[];
  equipment?: string[];
}

export const PAGE_SIZE = 20;

/**
 * Get paginated workouts for the authenticated user
 */
export async function getUserWorkouts(page = 0, ascending = false): Promise<Workout[]> {
  const { data, error } = await supabase.rpc("get_user_workouts", {
    p_limit: PAGE_SIZE,
    p_offset: page * PAGE_SIZE,
    p_ascending: ascending,
  });

  if (error) {
    console.error("Error fetching user workouts:", error);
    throw error;
  }

  return data as Workout[];
}

/**
 * Get detailed information about a specific workout
 * @param workoutId - The workout ID to fetch details for
 * @returns Detailed workout information including exercises and logs
 */
export async function getWorkoutDetails(workoutId: string) {
  const { data, error } = await supabase.rpc("get_workout_details", {
    p_workout_id: workoutId,
  });

  if (error) {
    console.error("Error fetching workout details:", error);
    throw error;
  }

  return data as WorkoutDetails;
}

/**
 * Delete a specific set entry
 * @param setId - The set ID to delete
 * @returns true if deleted, false if not found (RLS may silently filter unauthorized)
 */
export async function deleteSet(setId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_set", {
    p_set_id: setId,
  });

  if (error) {
    console.error("Error deleting set:", error);
    throw error;
  }

  return data as boolean;
}

/**
 * Get all filter relationships for client-side cascading (workouts)
 * Returns all (category, equipment) combinations in user's logs
 */
export async function getWorkoutFilterRelationships(): Promise<WorkoutFilterRelationship[]> {
  const { data, error } = await supabase.rpc("get_filter_relationships");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    exercise_kind: row.exercise_kind,
    equipment: row.equipment,
  }));
}

/**
 * Get filtered workouts for the authenticated user (returns all matches)
 */
export async function filterUserWorkouts(
  filters: WorkoutFilters,
  ascending = false,
): Promise<Workout[]> {
  const { data, error } = await supabase.rpc("filter_user_workouts", {
    p_exercise_kinds: filters.exercise_kinds?.length ? filters.exercise_kinds : null,
    p_equipment: filters.equipment?.length ? filters.equipment : null,
    p_date_from: null,
    p_date_to: null,
    p_ascending: ascending,
    p_limit: null,
  });

  if (error) {
    console.error("Error filtering workouts:", error);
    throw error;
  }

  return data as Workout[];
}

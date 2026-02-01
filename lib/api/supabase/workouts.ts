import { supabase } from './client';
import { Workout, WorkoutDetails } from '@/types/exercise';

/**
 * Workouts API
 * All workout-related database operations
 */

export interface WorkoutFilterOptions {
  categories: string[];
  equipment: string[];
}

export interface WorkoutFilterRelationship {
  category: string;
  equipment: string | null;
}

export interface WorkoutFilters {
  categories?: string[];
  equipment?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Get all workouts for the authenticated user
 * Automatically uses the authenticated user's ID (auth.uid())
 * @returns Array of workout summaries
 */
export async function getUserWorkouts() {
  const { data, error } = await supabase.rpc("get_user_workouts");

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
 * Delete a specific log entry
 * @param logId - The log ID to delete
 * @returns true if deleted, false if not found (RLS may silently filter unauthorized)
 */
export async function deleteLog(logId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_log", {
    p_log_id: logId,
  });

  if (error) {
    console.error("Error deleting log:", error);
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
    category: row.category,
    equipment: row.equipment,
  }));
}

/**
 * Get filtered workouts for the authenticated user
 */
export async function filterUserWorkouts(filters: WorkoutFilters): Promise<Workout[]> {
  const { data, error } = await supabase.rpc("filter_user_workouts", {
    p_categories: filters.categories?.length ? filters.categories : null,
    p_equipment: filters.equipment?.length ? filters.equipment : null,
    p_date_from: filters.dateFrom?.toISOString() ?? null,
    p_date_to: filters.dateTo?.toISOString() ?? null,
  });

  if (error) {
    console.error("Error filtering workouts:", error);
    throw error;
  }

  return data as Workout[];
}

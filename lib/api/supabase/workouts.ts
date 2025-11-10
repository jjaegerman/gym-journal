import { supabase } from './client';
import { Workout, WorkoutDetails } from '@/types/exercise';

/**
 * Workouts API
 * All workout-related database operations
 */

/**
 * Get all workouts for a user
 * @param userId - The user ID to fetch workouts for
 * @returns Array of workout summaries
 */
export async function getUserWorkouts(userId: string) {
  const { data, error } = await supabase.rpc("get_user_workouts", {
    p_user_id: userId,
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

// Future functions can be added here:
// export async function createWorkout(workoutData: CreateWorkoutInput) { }
// export async function updateWorkout(workoutId: string, updates: Partial<Workout>) { }
// export async function deleteWorkout(workoutId: string) { }

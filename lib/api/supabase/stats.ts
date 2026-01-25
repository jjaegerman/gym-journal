import { supabase } from './client';

/**
 * Stats API
 * Functions for retrieving user workout statistics
 */

export interface ProfileStats {
  // All-time
  total_workouts: number;
  total_hours: number;
  current_streak_days: number;
  longest_streak_days: number;

  // Recent (last 4 weeks)
  recent_workouts_per_week: number;
  recent_hours_per_week: number;
  recent_avg_duration_minutes: number;
  recent_total_volume: number;
  recent_total_distance: number;

  // Previous 4 weeks (for trends)
  prev_workouts_per_week: number;
  prev_hours_per_week: number;
  prev_avg_duration_minutes: number;
  prev_total_volume: number;
  prev_total_distance: number;
}

export interface ExerciseStats {
  category: string;
  modifiers: string[] | null;
  equipment: string | null;

  // All-time stats
  total_workouts: number;
  total_volume: number;
  total_distance: number;
  alltime_max_weight: number | null;
  alltime_max_distance: number | null;
  alltime_avg_pace: number | null;
  alltime_max_reps: number | null;

  // Recent 4 weeks
  recent_workouts_per_week: number;
  recent_volume_per_week: number;
  recent_distance_per_week: number;
  recent_max_weight: number | null;
  recent_max_distance: number | null;
  recent_avg_pace: number | null;
  recent_max_reps: number | null;

  // Previous 4 weeks (for trends)
  prev_workouts_per_week: number;
  prev_volume_per_week: number;
  prev_distance_per_week: number;
  prev_max_weight: number | null;
  prev_max_distance: number | null;
  prev_avg_pace: number | null;
  prev_max_reps: number | null;

  last_logged: string;
}

/**
 * Get comprehensive user profile statistics
 * Automatically uses the authenticated user's ID (auth.uid())
 */
export async function getUserProfileStats(): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc('get_user_profile_stats');

  if (error) throw error;
  return data as ProfileStats;
}

/**
 * Get per-exercise statistics
 * Automatically uses the authenticated user's ID (auth.uid())
 * Returns both all-time and recent (4 weeks) data
 */
export async function getExerciseStats(): Promise<ExerciseStats[]> {
  const { data, error } = await supabase.rpc('get_exercise_stats');

  if (error) throw error;
  return data as ExerciseStats[];
}

/**
 * Get current workout streak
 * Automatically uses the authenticated user's ID (auth.uid())
 */
export async function getCurrentStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_current_streak');

  if (error) throw error;
  return data as number;
}

/**
 * Get longest workout streak
 * Automatically uses the authenticated user's ID (auth.uid())
 */
export async function getLongestStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_longest_streak');

  if (error) throw error;
  return data as number;
}

import { supabase } from './client';

/**
 * Stats API
 * Functions for retrieving user workout statistics
 */

export interface ProfileStats {
  total_workouts: number;
  total_hours: number;
  workouts_last_30_days: number;
  workouts_last_7_days: number;
  current_streak_days: number;
  longest_streak_days: number;
  avg_workouts_per_week: number;
  most_common_day: string;
}

export interface ExerciseStats {
  exercise_type: string;
  exercise_variants: string[] | null;
  exercise_equipment: string | null;
  total_workouts: number;
  total_sets: number;
  max_weight: number | null;
  max_reps: number;
  max_volume: number;
  avg_weight: number | null;
  workouts_per_week: number;
  first_logged: string;
  last_logged: string;
}

/**
 * Get comprehensive user profile statistics
 * Automatically uses the authenticated user's ID (auth.uid())
 */
export async function getUserProfileStats(
  daysBack: number = 90
): Promise<ProfileStats> {
  // Get user's timezone (e.g., "America/New_York")
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data, error } = await supabase.rpc('get_user_profile_stats', {
    p_days_back: daysBack,
    p_timezone: timezone,
  });

  if (error) throw error;
  return data as ProfileStats;
}

/**
 * Get per-exercise statistics
 * Automatically uses the authenticated user's ID (auth.uid())
 */
export async function getExerciseStats(
  daysBack: number = 90
): Promise<ExerciseStats[]> {
  const { data, error } = await supabase.rpc('get_exercise_stats', {
    p_days_back: daysBack,
  });

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

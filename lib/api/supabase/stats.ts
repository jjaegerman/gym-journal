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

export interface ExerciseFilterOptions {
  categories: string[];
  modifiers: string[];
  equipment: string[];
}

export interface ExerciseFilters {
  categories?: string[];
  modifiers?: string[];
  equipment?: string[];
  timeRange?: 'all_time' | '1_year' | '3_months' | '1_month';
}

export interface AppliedFilters {
  categories: string[];
  equipment: string[];
  modifiers: string[];
  timeRange: 'all_time' | '1_year' | '3_months' | '1_month';
}

export interface FilteredExerciseStats {
  matchedExercises: number;
  displayName: string;
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  totalDistance: number;
  maxWeight: number | null;
  maxReps: number | null;
  weightPr: { value: number; date: string; exercise: string } | null;
  repsPr: { value: number; date: string; exercise: string } | null;
  progressData: { week: string; volume: number; maxWeight: number }[];
  recentSessions: { workoutId: string; date: string; summary: string }[];
  firstLogged: string | null;
  lastLogged: string | null;
  appliedFilters: AppliedFilters | null;
}

/**
 * Get available filter options for exercise stats
 */
export async function getExerciseFilterOptions(): Promise<ExerciseFilterOptions> {
  const { data, error } = await supabase.rpc("get_exercise_filter_options");

  if (error) {
    console.error("Error fetching exercise filter options:", error);
    throw error;
  }

  const row = data?.[0] ?? { categories: [], modifiers: [], equipment: [] };
  return {
    categories: row.categories ?? [],
    modifiers: row.modifiers ?? [],
    equipment: row.equipment ?? [],
  };
}

/**
 * Get filtered exercise stats with progress data and PRs
 */
export async function getFilteredExerciseStats(
  filters?: ExerciseFilters
): Promise<FilteredExerciseStats> {
  const { data, error } = await supabase.rpc("get_filtered_exercise_stats", {
    p_categories: filters?.categories?.length ? filters.categories : null,
    p_modifiers: filters?.modifiers?.length ? JSON.stringify(filters.modifiers) : null,
    p_equipment: filters?.equipment?.length ? filters.equipment : null,
    p_time_range: filters?.timeRange ?? 'all_time',
  });

  if (error) {
    console.error("Error fetching filtered exercise stats:", error);
    throw error;
  }

  const row = data?.[0];
  if (!row) {
    return {
      matchedExercises: 0,
      displayName: 'No exercises',
      totalWorkouts: 0,
      totalSets: 0,
      totalVolume: 0,
      totalDistance: 0,
      maxWeight: null,
      maxReps: null,
      weightPr: null,
      repsPr: null,
      progressData: [],
      recentSessions: [],
      firstLogged: null,
      lastLogged: null,
      appliedFilters: null,
    };
  }

  return {
    matchedExercises: row.matched_exercises ?? 0,
    displayName: row.display_name ?? 'No exercises',
    totalWorkouts: row.total_workouts ?? 0,
    totalSets: row.total_sets ?? 0,
    totalVolume: row.total_volume ?? 0,
    totalDistance: row.total_distance ?? 0,
    maxWeight: row.max_weight,
    maxReps: row.max_reps,
    weightPr: row.weight_pr,
    repsPr: row.reps_pr,
    progressData: row.progress_data ?? [],
    recentSessions: row.recent_sessions ?? [],
    firstLogged: row.first_logged,
    lastLogged: row.last_logged,
    appliedFilters: row.applied_filters ?? null,
  };
}

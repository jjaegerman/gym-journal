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
  exercise_kinds: string[];
  modifiers: string[];
  equipment: string[];
}

export interface FilterRelationship {
  exercise_kind: string;
  equipment: string | null;
  modifiers: string[];
}

export interface ExerciseFilters {
  exercise_kinds?: string[];
  modifiers?: string[];
  equipment?: string[];
  timeRange?: 'all_time' | '1_year' | '3_months' | '1_month';
}

export interface AppliedFilters {
  exercise_kinds: string[];
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
  totalDurationSeconds: number;
  maxDurationSeconds: number | null;
  bestPace: number | null;
  maxResistanceLevel: number | null;
  weightUnit: string | null;
  distanceUnit: string | null;
  weightPr: { value: number; date: string; exercise: string; workoutId?: string } | null;
  repsPr: { value: number; date: string; exercise: string; workoutId?: string } | null;
  progressData: {
    week: string;
    volume: number;
    maxWeight: number;
    maxReps: number | null;
    distance: number | null;
    avgPace: number | null;
    maxDuration: number | null;
    maxResistance: number | null;
  }[];
  recentSessions: { workoutId: string; date: string; summary: string }[];
  firstLogged: string | null;
  lastLogged: string | null;
  appliedFilters: AppliedFilters | null;
}

/**
 * Get all filter relationships for client-side cascading
 * Returns all (category, equipment, modifiers) combinations in user's logs
 */
export async function getFilterRelationships(): Promise<FilterRelationship[]> {
  const { data, error } = await supabase.rpc("get_filter_relationships");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    exercise_kind: row.exercise_kind,
    equipment: row.equipment,
    modifiers: Array.isArray(row.modifiers) ? row.modifiers : [],
  }));
}

/**
 * Get filtered exercise stats with progress data and PRs
 */
export async function getFilteredExerciseStats(
  filters?: ExerciseFilters
): Promise<FilteredExerciseStats> {
  const { data, error } = await supabase.rpc("get_filtered_exercise_stats", {
    p_exercise_kinds: filters?.exercise_kinds?.length ? filters.exercise_kinds : null,
    p_modifiers: filters?.modifiers?.length ? filters.modifiers : null,
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
      totalDurationSeconds: 0,
      maxDurationSeconds: null,
      bestPace: null,
      maxResistanceLevel: null,
      weightUnit: null,
      distanceUnit: null,
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
    totalDurationSeconds: row.total_duration_seconds ?? 0,
    maxDurationSeconds: row.max_duration_seconds ?? null,
    bestPace: row.best_pace ?? null,
    maxResistanceLevel: row.max_resistance_level ?? null,
    weightUnit: row.weight_unit ?? null,
    distanceUnit: row.distance_unit ?? null,
    weightPr: row.weight_pr,
    repsPr: row.reps_pr,
    progressData: row.progress_data ?? [],
    recentSessions: row.recent_sessions ?? [],
    firstLogged: row.first_logged,
    lastLogged: row.last_logged,
    appliedFilters: row.applied_filters ?? null,
  };
}

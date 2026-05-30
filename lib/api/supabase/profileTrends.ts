import { supabase } from './client';

export interface WeeklyTrendPoint {
  week_start: string;
  workout_count: number;
  total_minutes: number;
  total_volume: number;
}

export interface WeeklyTrends {
  weight_unit: 'kg' | 'lbs';
  distance_unit: 'km' | 'miles';
  weeks: WeeklyTrendPoint[];
}

export async function getProfileWeeklyTrends(
  startDate: string,
  endDate: string
): Promise<WeeklyTrends> {
  const { data, error } = await supabase.rpc('get_user_profile_weekly_trends', {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return data as WeeklyTrends;
}

export interface DailySummaryPoint {
  day: string;
  workout_count: number;
  total_minutes: number;
}

export async function getDailyTrainingSummary(
  startDate: string,
  endDate: string
): Promise<DailySummaryPoint[]> {
  const { data, error } = await supabase.rpc('get_daily_training_summary', {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw error;
  return (data ?? []) as DailySummaryPoint[];
}

export type PrType =
  | 'weight'
  | 'reps_at_top'
  | 'distance'
  | 'pace'
  | 'duration'
  | 'new_movement';

export interface PrTimelineEntry {
  pr_type: PrType;
  exercise_kind: string;
  modifiers: string[];
  equipment: string | null;
  display_name: string;
  value: number;
  unit: string;
  previous_value: number | null;
  delta: number | null;
  achieved_at: string;
  workout_id: string;
  set_id: string;
}

export type ProfileRange = '1_month' | '3_months' | '1_year' | 'all_time';

export async function getUserPrTimeline(
  range: ProfileRange,
  limit: number,
  weightUnit: 'kg' | 'lbs',
  distanceUnit: 'km' | 'miles'
): Promise<PrTimelineEntry[]> {
  const { data, error } = await supabase.rpc('get_user_pr_timeline', {
    p_time_range: range,
    p_limit: limit,
    p_preferred_weight_unit: weightUnit,
    p_preferred_distance_unit: distanceUnit,
  });
  if (error) throw error;
  return (data ?? []) as PrTimelineEntry[];
}

export function rangeToDates(
  range: ProfileRange,
  earliestWorkoutDate?: string | null
): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  let start: Date;
  switch (range) {
    case '1_month':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case '3_months':
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      break;
    case '1_year':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'all_time':
      return {
        startDate: earliestWorkoutDate ?? '1970-01-01',
        endDate,
      };
  }
  return { startDate: start.toISOString().slice(0, 10), endDate };
}

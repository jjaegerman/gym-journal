import { Platform } from "react-native";
import type { ExerciseFilters } from "@/lib/api/supabase/stats";

/**
 * Base URL for shareable links.
 *
 * Prod: https://gym-journal.com
 * Dev (web):    the current window origin (e.g. http://localhost:8081)
 * Dev (native): http://localhost:8081 as a best-effort fallback
 *
 * When a user handle column is introduced later, replace the `uid` query
 * param in `buildStatsShareUrl` with a handle and update `parseStatsShareParams`.
 */
export function getShareBaseUrl(): string {
  if (__DEV__) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:8081";
  }
  return "https://gym-journal.com";
}

export function buildWorkoutShareUrl(workoutId: string): string {
  return `${getShareBaseUrl()}/share/workout/${workoutId}`;
}

export function buildStatsShareUrl(
  userId: string,
  filters: ExerciseFilters
): string {
  const params = new URLSearchParams();
  params.set("uid", userId);
  if (filters.exercise_kinds?.length) {
    params.set("exercise_kinds", filters.exercise_kinds.join(","));
  }
  if (filters.modifiers?.length) {
    params.set("modifiers", filters.modifiers.join(","));
  }
  if (filters.equipment?.length) {
    params.set("equipment", filters.equipment.join(","));
  }
  if (filters.timeRange) {
    params.set("time_range", filters.timeRange);
  }
  if (filters.preferredWeightUnit) {
    params.set("weight_unit", filters.preferredWeightUnit);
  }
  if (filters.preferredDistanceUnit) {
    params.set("distance_unit", filters.preferredDistanceUnit);
  }
  return `${getShareBaseUrl()}/share/stats?${params.toString()}`;
}

type RawParams = Record<string, string | string[] | undefined>;

export function parseStatsShareParams(
  params: RawParams
): { userId: string; filters: ExerciseFilters } | null {
  const get = (k: string): string | undefined => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const split = (k: string): string[] | undefined =>
    get(k)
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const userId = get("uid");
  if (!userId) return null;

  const timeRange = get("time_range") as ExerciseFilters["timeRange"];
  return {
    userId,
    filters: {
      exercise_kinds: split("exercise_kinds"),
      modifiers: split("modifiers"),
      equipment: split("equipment"),
      timeRange: timeRange ?? "all_time",
      preferredWeightUnit: get("weight_unit") ?? "lbs",
      preferredDistanceUnit: get("distance_unit") ?? "miles",
    },
  };
}

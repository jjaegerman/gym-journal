import { z } from "zod";

export type EffortLevel = "low" | "medium" | "high";
export type WeightUnit = "kg" | "lbs";

/**
 * Represents a single set performed for an exercise.
 */
export interface Log {
  id: string;
  exerciseId: string;
  datetime: Date;
  weight?: { value: number; unit: WeightUnit };
  repetitions?: number;
  duration?: number; // in seconds, for time-based exercises
  effort?: EffortLevel;
}

/**
 * Represents a specific exercise performed in a workout (e.g. "Bench Press").
 * Groups all its sets (logs).
 */
export interface Exercise {
  id: string;
  workoutId: string;
  name: string; // e.g., "Bench Press"
  logs: Log[]; // each log = one set
}

/**
 * Represents a full workout session (e.g., "Leg Day - Oct 26").
 * Groups multiple exercises.
 */
export interface Workout {
  id: string;
  user_id: string;
  datetime: Date;
  exercises: Exercise[];
  duration: number; // total workout duration seconds
}

import { z } from "zod";

/* --- Literal enums --- */
export const EffortLevelSchema = z.enum(["low", "medium", "high"]);
export type EffortLevel = z.infer<typeof EffortLevelSchema>;

export const WeightUnitSchema = z.enum(["kg", "lbs"]);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

/* --- Set (single performance set) --- */
export const SetSchema = z.object({
  id: z.string(),
  input: z.string(),
  datetime: z.coerce.date(),

  // Strength metrics
  weight: z.coerce.number().nullable().optional(),
  weightUnit: WeightUnitSchema.nullable().optional(),
  repetitions: z.coerce.number().int().nullable().optional(),

  // Cardio metrics
  distance: z.coerce.number().nullable().optional(),
  distanceUnit: z.string().nullable().optional(),
  resistanceLevel: z.coerce.number().int().nullable().optional(),

  // General
  duration: z.iso.duration().nullable().optional(),
  effort: EffortLevelSchema.nullable().optional(),
});
export type Set = z.infer<typeof SetSchema>;

/* --- Exercise (groups sets by exercise_kind, modifiers, equipment) --- */
export const ExerciseSchema = z.object({
  id: z.string(),
  exercise_kind: z.string(),
  modifiers: z.array(z.string()).nullable().optional(),
  equipment: z.string().nullable().optional(),
  sets: z.array(SetSchema),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

/* --- Workout (summary) --- */
export const WorkoutSchema = z.object({
  id: z.string(),
  datetime: z.coerce.date(),
  exerciseCount: z.coerce.number().int(),
  setCount: z.coerce.number().int(),
  mostRecentLog: z.coerce.date(),
  exercisePreview: z.array(z.string()).nullable().optional(),
  totalVolume: z.coerce.number().nullable().optional(),
  totalDistance: z.coerce.number().nullable().optional(),
  distanceUnit: z.string().nullable().optional(),
  durationMinutes: z.coerce.number().int(),
});
export type Workout = z.infer<typeof WorkoutSchema>;
export const WorkoutsArraySchema = z.array(WorkoutSchema);

/* --- WorkoutDetails (full with exercises) --- */
export const WorkoutDetailsSchema = z.object({
  id: z.string(),
  datetime: z.coerce.date(),
  endTime: z.coerce.date().nullable().optional(),
  exercises: z.array(ExerciseSchema),
});
export type WorkoutDetails = z.infer<typeof WorkoutDetailsSchema>;

/* --- LogSubmission (source of truth) --- */
export const LogSubmissionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  workoutId: z.string().uuid().nullable(),
  submissionType: z.enum(["audio", "text"]),
  rawText: z.string(),
  aiResponse: z.any().nullable(),
  modelVersion: z.string(),
  promptVersion: z.string(),
  audioDurationSeconds: z.number().nullable(),
  createdAt: z.string(),
});
export type LogSubmission = z.infer<typeof LogSubmissionSchema>;

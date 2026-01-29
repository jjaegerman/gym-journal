import { z } from "zod";

/* --- Literal enums --- */
export const EffortLevelSchema = z.enum(["low", "medium", "high"]);
export type EffortLevel = z.infer<typeof EffortLevelSchema>;

export const WeightUnitSchema = z.enum(["kg", "lbs"]);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

/* --- Log (single set) --- */
export const LogSchema = z.object({
  id: z.string(),
  input: z.string().nullable().optional(),
  datetime: z.coerce.date(),

  // Strength metrics
  weight: z.coerce.number().nullable().optional(),
  weightUnit: WeightUnitSchema.nullable().optional(),
  repetitions: z.coerce.number().int().nullable().optional(),

  // Cardio metrics
  distance: z.coerce.number().nullable().optional(),
  distance_unit: z.string().nullable().optional(),
  resistance_level: z.coerce.number().int().nullable().optional(),

  // General
  duration: z.iso.duration().nullable().optional(),
  effort: EffortLevelSchema.nullable().optional(),
});
export type Log = z.infer<typeof LogSchema>;

/* --- Exercise (groups logs by category, modifiers, equipment) --- */
export const ExerciseSchema = z.object({
  id: z.string(),
  category: z.string(),
  modifiers: z.array(z.string()).nullable().optional(),
  equipment: z.string().nullable().optional(),
  logs: z.array(LogSchema),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

/* --- Workout (summary) --- */
export const WorkoutSchema = z.object({
  id: z.string(),
  datetime: z.coerce.date(),
  exerciseCount: z.coerce.number().int(),
  logCount: z.coerce.number().int(),
  mostRecentLog: z.coerce.date(),
  exercisePreview: z.array(z.string()).nullable().optional(),
  totalVolume: z.coerce.number().nullable().optional(),
  totalDistance: z.coerce.number().nullable().optional(),
  distanceUnit: z.string().nullable().optional(),
});
export type Workout = z.infer<typeof WorkoutSchema>;
export const WorkoutsArraySchema = z.array(WorkoutSchema);

/* --- WorkoutDetails (full with exercises) --- */
export const WorkoutDetailsSchema = z.object({
  id: z.string(),
  datetime: z.coerce.date(),
  exercises: z.array(ExerciseSchema),
});
export type WorkoutDetails = z.infer<typeof WorkoutDetailsSchema>;

/* --- WorkoutSubmission (source of truth) --- */
export const WorkoutSubmissionSchema = z.object({
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
export type WorkoutSubmission = z.infer<typeof WorkoutSubmissionSchema>;

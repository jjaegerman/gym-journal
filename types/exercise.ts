import { z } from "zod";

/* --- Literal enums --- */
export const EffortLevelSchema = z.enum(["low", "medium", "high"]);
export type EffortLevel = z.infer<typeof EffortLevelSchema>;

export const WeightUnitSchema = z.enum(["kg", "lbs"]);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

/* --- Log (single set) --- */
export const LogSchema = z.object({
  id: z.string(),
  datetime: z.coerce.date(),          // converts ISO string → Date
  weight: z.coerce.number().nullable().optional(), // converts "135" → 135
  weightUnit: WeightUnitSchema.nullable().optional(),
  repetitions: z.coerce.number().int().nullable().optional(),
  duration: z.coerce.number().int().nullable().optional(),
  effort: EffortLevelSchema.nullable().optional(),
});
export type Log = z.infer<typeof LogSchema>;

/* --- Exercise (groups logs) --- */
export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
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

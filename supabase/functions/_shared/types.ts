import { z } from "npm:zod";

export const ExerciseCategory = z.enum([
  // Compound Lower Body
  "Squat",
  "Deadlift",
  "Lunge",

  // Compound Upper Body
  "Bench Press",
  "Overhead Press",
  "Row",
  "Pulldown",

  // Olympic & Power
  "Snatch",
  "Clean and Jerk",

  // Isolation - Lower
  "Quad Isolation",
  "Glute Isolation",
  "Hip Isolation",
  "Calf Isolation",
  "Legs Other",

  // Isolation - Upper
  "Chest Isolation",
  "Shoulder Isolation",
  "Tricep Isolation",
  "Bicep Curl",
  "Forearm Isolation",
  "Arms Other",

  // Calisthenics
  "Pull-up",
  "Push-up",
  "Dip",
  "Calisthenics Other",

  // Core & Cardio
  "Core",
  "Running",
  "Cycling",
  "Swimming",
  "Rowing",
  "Cardio Other",

  // Other
  "Other",
]);

export const Equipment = z.enum([
  // Free Weights
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "EZ Bar",
  "Trap Bar",

  // Machines
  "Cable Machine",
  "Weight Machine",
  "Smith Machine",

  // Cardio Equipment
  "Treadmill",
  "Rowing Machine",
  "Stationary Bike",
  "Elliptical",
  "Stair Climber",

  // Bodyweight & Functional
  "Resistance Band",

  // Specialized
  "Medicine Ball",
  "Stability Ball",
  "Sled",
  "Battle Rope",
  "Jump Rope",
  "Box",
  "Ab Wheel",

  // Other
  "Other",
]);

export const OpenAILogDetails = z.object({
  // Exercise identification
  exerciseType: ExerciseCategory,
  variants: z.array(z.string()).nullable().optional(),
  primaryEquipment: Equipment.nullable().optional(),
  exerciseName: z.string().nullable().optional(),

  // Strength training metrics
  weight: z.number().nullable().optional(),
  weightUnit: z.enum(["kg", "lbs"]).nullable().optional(),
  repetitions: z.number().nullable().optional(),

  // Cardio metrics
  distance: z.number().nullable().optional(),
  distanceUnit: z.enum(["miles", "km", "meters"]).nullable().optional(),
  duration: z.iso.duration().nullable().optional(),
  resistanceLevel: z.number().nullable().optional(),

  // General effort
  effort: z.enum(["low", "medium", "high"]).nullable().optional(),
});

export const OpenAILogDetailsArray = z.object({
  items: z.array(OpenAILogDetails).nullable().optional(),
});

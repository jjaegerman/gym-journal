import { z } from "npm:zod";

export const ExerciseCategory = z.enum([
  // Compound Lower Body
  "Squat",
  "Deadlift",
  "Lunge & Split",

  // Compound Upper Body
  "Bench Press",
  "Overhead Press",
  "Row",
  "Pull-up & Pulldown",

  // Olympic & Power
  "Olympic Lift",
  "Power",

  // Isolation - Lower
  "Leg Isolation",
  "Glute Isolation",
  "Calf",

  // Isolation - Upper
  "Chest Isolation",
  "Shoulder Isolation",
  "Arm",

  // Core & Cardio
  "Core",
  "Cardio",
  "Other"
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

  // Bodyweight & Functional
  "Bodyweight",
  "Pull-up Bar",
  "Dip Bar",
  "Suspension Trainer",
  "Resistance Band",

  // Specialized
  "Medicine Ball",
  "Stability Ball",
  "Landmine",
  "Sled",
  "Battle Rope",
  "Sandbag",
  "Jump Rope",
  "Box",
  "Ab Wheel",

  // Other
  "Other"
]);

export const OpenAILogDetails = z.object({
    // Exercise identification
    exerciseType: ExerciseCategory,
    exerciseVariant: z.string(),
    primaryEquipment: Equipment.nullable().optional(),

    // Strength training metrics
    weight: z.number().nullable().optional(),
    weightUnit: z.enum(["kg", "lbs"]).nullable().optional(),
    repetitions: z.number().nullable().optional(),
    sets: z.number().nullable().optional(),

    // Cardio metrics
    distance: z.number().nullable().optional(),
    distanceUnit: z.enum(["miles", "km", "meters"]).nullable().optional(),
    duration: z.iso.duration().nullable().optional(),
    resistanceLevel: z.number().nullable().optional(),

    // General effort
    effort: z.enum(["low", "medium", "high"]).nullable().optional(),
})

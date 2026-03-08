import { z } from "npm:zod";

export const ExerciseKind = z.enum([
  // Compound Lower - Knee Dominant
  "Squat",
  "Lunge",

  // Compound Lower - Hip Dominant
  "Deadlift",
  "Hip Hinge",

  // Compound Upper - Horizontal Push
  "Bench Press",
  "Push-up",

  // Compound Upper - Vertical Push
  "Overhead Press",
  "Dip",

  // Compound Upper - Horizontal Pull
  "Row",

  // Compound Upper - Vertical Pull
  "Pull-up",
  "Lat Pulldown",

  // Olympic
  "Clean",
  "Snatch",
  "Jerk",

  // Isolation - Lower
  "Leg Extension",
  "Leg Curl",
  "Calf Raise",
  "Hip Adduction",
  "Hip Abduction",

  // Isolation - Upper
  "Chest Fly",
  "Lateral Raise",
  "Rear Delt",
  "Tricep Extension",
  "Bicep Curl",
  "Shrug",
  "Forearm",

  // Core
  "Core",

  // Functional
  "Carry",
  "Plyometric",

  // Cardio
  "Running",
  "Cycling",
  "Stationary Bike",
  "Rowing Machine",
  "Swimming",
  "Elliptical",
  "Stair Climber",
  "Jump Rope",
  "Cardio Other",

  // Catch-all
  "Other",
]);

export const Modifier = z.enum([
  // Body/Bench Angle
  "Incline",
  "Decline",
  "Seated",
  "Standing",
  "Lying",
  "Prone",
  "Kneeling",

  // Load Position
  "Front",
  "Back",
  "Overhead",
  "Zercher",
  "Goblet",
  "Behind Neck",

  // Stance
  "Sumo",
  "Conventional",
  "Split",
  "Single Leg",
  "Single Arm",
  "Staggered",
  "Wide Stance",
  "Narrow Stance",

  // Grip
  "Close Grip",
  "Wide Grip",
  "Neutral Grip",
  "Underhand",
  "Overhand",
  "Mixed Grip",
  "Snatch Grip",

  // Tempo & Technique
  "Pause",
  "Tempo",
  "Explosive",
  "Eccentric",
  "Isometric",
  "Banded",
  "Weighted",

  // Range of Motion
  "Deficit",
  "Elevated",
  "Block",
  "Floor",
  "Pin",
  "Partial",

  // Named Squat Variations
  "Box",
  "Hack",
  "Sissy",
  "Pistol",
  "Bulgarian",
  "Cossack",

  // Named Deadlift/Hinge Variations
  "Romanian",
  "Stiff Leg",
  "Kickstand",

  // Named Press Variations
  "Spoto",
  "Larsen",
  "JM",
  "Z",
  "Arnold",
  "Push Press",

  // Named Row Variations
  "Pendlay",
  "Meadows",
  "Kroc",
  "Seal",
  "Batwing",
  "T-Bar",

  // Named Curl Variations
  "Preacher",
  "Spider",
  "Concentration",
  "Hammer",
  "Drag",
  "Reverse",
  "Zottman",
  "21s",

  // Named Tricep Variations
  "Skull Crusher",
  "Kickback",
  "Pushdown",
  "French",

  // Named Other
  "Face Pull",
  "Pullover",
  "Cable Crossover",
  "Farmer",
  "Suitcase",
  "Rack",
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

  // Bodyweight & Functional
  "Resistance Band",

  // Specialized
  "Medicine Ball",
  "Stability Ball",
  "Sled",
  "Battle Rope",
  "Box",
  "Ab Wheel",

  // Other
  "Other",
]);

export const OpenAILogDetails = z.object({
  // Exercise identification
  input: z.string(), // Raw exercise input as spoken (source of truth)
  exercise_kind: ExerciseKind,
  modifiers: z.array(Modifier).nullable().optional(),
  equipment: Equipment.nullable().optional(),

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

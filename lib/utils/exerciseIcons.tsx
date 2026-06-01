import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "tamagui";

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type Category =
  | "lower_knee"
  | "lower_hip"
  | "calves"
  | "push"
  | "pull"
  | "olympic"
  | "shoulders"
  | "arms"
  | "core"
  | "functional"
  | "cardio_run"
  | "cardio_bike"
  | "cardio_row"
  | "cardio_swim"
  | "cardio_stairs"
  | "cardio_jump_rope"
  | "cardio_other"
  | "other";

const CATEGORY_ICON: Record<Category, MCIName> = {
  lower_knee:       "weight-lifter",
  lower_hip:        "kettlebell",
  calves:           "foot-print",
  push:             "arrow-up-bold",
  pull:             "arrow-down-bold",
  olympic:          "flash",
  shoulders:        "human-handsup",
  arms:             "arm-flex",
  core:             "yoga",
  functional:       "bag-suitcase",
  cardio_run:       "run",
  cardio_bike:      "bike",
  cardio_row:       "rowing",
  cardio_swim:      "swim",
  cardio_stairs:    "stairs",
  cardio_jump_rope: "jump-rope",
  cardio_other:     "heart-pulse",
  other:            "dumbbell",
};

const KIND_CATEGORY: Record<string, Category> = {
  // Lower - knee dominant
  "Squat":            "lower_knee",
  "Lunge":            "lower_knee",
  "Leg Press":        "lower_knee",
  "Leg Extension":    "lower_knee",

  // Lower - hip dominant (incl. hip abductors/adductors)
  "Deadlift":         "lower_hip",
  "Hip Hinge":        "lower_hip",
  "Leg Curl":         "lower_hip",
  "Hip Adduction":    "lower_hip",
  "Hip Abduction":    "lower_hip",

  // Calves
  "Calf Raise":       "calves",

  // Push
  "Bench Press":      "push",
  "Push-up":          "push",
  "Overhead Press":   "push",
  "Dip":              "push",
  "Chest Fly":        "push",

  // Pull
  "Row":              "pull",
  "Pull-up":          "pull",
  "Lat Pulldown":     "pull",

  // Olympic
  "Clean":            "olympic",
  "Snatch":           "olympic",
  "Jerk":             "olympic",

  // Shoulders (isolation)
  "Lateral Raise":    "shoulders",
  "Rear Delt":        "shoulders",
  "Shrug":            "shoulders",

  // Arms (bi/tri/forearm)
  "Bicep Curl":       "arms",
  "Tricep Extension": "arms",
  "Forearm":          "arms",

  // Core
  "Core":             "core",

  // Functional
  "Carry":            "functional",
  "Plyometric":       "functional",

  // Cardio
  "Running":          "cardio_run",
  "Cycling":          "cardio_bike",
  "Stationary Bike":  "cardio_bike",
  "Rowing Machine":   "cardio_row",
  "Swimming":         "cardio_swim",
  "Elliptical":       "cardio_stairs",
  "Stair Climber":    "cardio_stairs",
  "Jump Rope":        "cardio_jump_rope",
  "Cardio Other":     "cardio_other",

  // Catch-all
  "Other":            "other",
};

function resolveIcon(kind?: string | null): MCIName {
  const cat = (kind && KIND_CATEGORY[kind]) || "other";
  return CATEGORY_ICON[cat];
}

export function ExerciseIcon({
  kind,
  size = 20,
}: {
  kind?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const color = (theme as any).color?.get?.() ?? "#888";
  return <MaterialCommunityIcons name={resolveIcon(kind)} size={size} color={color} />;
}

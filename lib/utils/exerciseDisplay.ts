/**
 * Exercise display formatting utilities
 *
 * Fields:
 * - input: Raw exercise input as spoken (source of truth)
 * - category: Structured category (from enum)
 * - modifiers: Array of variant modifiers
 * - equipment: Equipment used
 */

/**
 * Format exercise for display using structured fields
 * Format: {modifiers} {category} ({equipment})
 *
 * Use this for groupings, stats, and consistent display.
 *
 * Examples:
 * - Back Squat (Barbell)
 * - Close Grip Incline Bench Press (Dumbbell)
 * - Sumo Deadlift (Barbell)
 * - Running (Treadmill)
 *
 * @param exercise - Exercise data with modifiers, equipment, category
 * @returns Formatted exercise display string
 */
export function formatExerciseGrouping(exercise: {
  modifiers?: string[] | null;
  equipment?: string | null;
  exercise_kind?: string | null;
}): string {
  const mainParts = [
    ...(exercise.modifiers?.sort() || []),
    exercise.exercise_kind,
  ].filter(Boolean);

  const main = mainParts.join(" ");

  if (exercise.equipment) {
    return `${main} (${exercise.equipment})`;
  }

  return main;
}

/**
 * Get grouping key for exercises (used for stats aggregation)
 * Key format: {sorted_modifiers}|{equipment}|{category}
 *
 * @param exercise - Exercise data with modifiers, equipment, category
 * @returns Grouping key string
 */
export function getExerciseGroupingKey(exercise: {
  modifiers?: string[] | null;
  equipment?: string | null;
  exercise_kind?: string | null;
}): string {
  const modifierKey = exercise.modifiers?.sort().join(",") || "";
  const equipmentKey = exercise.equipment || "";
  const exerciseKindKey = exercise.exercise_kind || "";

  return `${modifierKey}|${equipmentKey}|${exerciseKindKey}`;
}

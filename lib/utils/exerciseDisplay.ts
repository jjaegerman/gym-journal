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
  category?: string | null;
}): string {
  const mainParts = [
    ...(exercise.modifiers?.sort() || []),
    exercise.category,
  ].filter(Boolean);

  const main = mainParts.join(" ");

  if (exercise.equipment) {
    return `${main} (${exercise.equipment})`;
  }

  return main;
}

/**
 * Format exercise for individual log display
 *
 * Uses the raw `input` field (source of truth) when available,
 * otherwise falls back to structured format.
 *
 * @param exercise - Exercise data with input, modifiers, equipment, category
 * @returns Formatted exercise label string
 */
export function formatExerciseLabel(exercise: {
  input?: string | null;
  modifiers?: string[] | null;
  equipment?: string | null;
  category?: string | null;
}): string {
  // If input exists, use it as the primary display
  if (exercise.input) {
    if (exercise.equipment) {
      return `${exercise.input} (${exercise.equipment})`;
    }
    return exercise.input;
  }

  // Fallback to structured format
  return formatExerciseGrouping(exercise);
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
  category?: string | null;
}): string {
  const modifierKey = exercise.modifiers?.sort().join(",") || "";
  const equipmentKey = exercise.equipment || "";
  const categoryKey = exercise.category || "";

  return `${modifierKey}|${equipmentKey}|${categoryKey}`;
}

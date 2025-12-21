/**
 * Exercise display formatting utilities
 * Handles composition of exercise names from variants, equipment, type, and name
 */

/**
 * Format exercise for display in workout/exercise views
 * Groups by: {variants} {equipment} {type}
 *
 * @param exercise - Exercise data with variants, equipment, type, name
 * @returns Formatted exercise display string
 */
export function formatExerciseGrouping(exercise: {
  variants?: string[] | null;
  equipment?: string | null;
  type?: string | null;
}): string {
  const parts = [
    ...(exercise.variants?.sort() || []),
    exercise.equipment,
    exercise.type,
  ].filter(Boolean);

  return parts.join(" ");
}

/**
 * Format exercise for individual log display
 * Displays as: {variants} {equipment} {name} when name exists
 * Otherwise falls back to: {variants} {equipment} {type}
 *
 * @param exercise - Exercise data with variants, equipment, type, name
 * @returns Formatted exercise label string
 */
export function formatExerciseLabel(exercise: {
  variants?: string[] | null;
  equipment?: string | null;
  type?: string | null;
  name?: string | null;
}): string {
  // If exerciseName exists (for "Other" categories), use it
  if (exercise.name) {
    const parts = [
      ...(exercise.variants?.sort() || []),
      exercise.equipment,
      exercise.name,
    ].filter(Boolean);
    return parts.join(" ");
  }

  // Otherwise use type
  return formatExerciseGrouping(exercise);
}

/**
 * Get grouping key for exercises (used for stats aggregation)
 * Key format: {sorted_variants}|{equipment}|{type}
 *
 * @param exercise - Exercise data with variants, equipment, type
 * @returns Grouping key string
 */
export function getExerciseGroupingKey(exercise: {
  variants?: string[] | null;
  equipment?: string | null;
  type?: string | null;
}): string {
  const variantKey = exercise.variants?.sort().join(",") || "";
  const equipmentKey = exercise.equipment || "";
  const typeKey = exercise.type || "";

  return `${variantKey}|${equipmentKey}|${typeKey}`;
}

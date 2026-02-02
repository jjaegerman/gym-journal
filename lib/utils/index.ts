/**
 * Utility Functions
 *
 * This module exports all utility functions used throughout the app.
 * Import from here for a cleaner, centralized approach.
 */

// Audio utilities
export { audioFileToBase64 } from "./audio";

// String utilities
export { capitalizeEachWord, capitalize, toTitleCase } from "./string";

// Date utilities
export {
  formatRelativeDate,
  formatDuration,
  parseIsoDuration,
  formatIsoDuration,
  getMonthLabel,
  getWeekRange,
  getSpecialDayLabel,
  getWeekKey,
} from "./date";

// Exercise utilities
export { getExerciseIcon, getExerciseIconColor } from "./exerciseIcons";
export {
  formatExerciseGrouping,
  getExerciseGroupingKey,
} from "./exerciseDisplay";

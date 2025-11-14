/**
 * Workout card color utilities
 * Provides color coding based on workout recency
 */

/**
 * Get color theme for workout card based on recency
 * @param date - Workout date
 * @returns Object with background and accent colors
 */
export function getWorkoutCardColors(date: Date): {
  backgroundColor: string;
  accentColor: string;
} {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today - green accent
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return {
      backgroundColor: "$green2",
      accentColor: "$green10",
    };
  }

  // This week (1-6 days ago) - blue accent
  if (diffDays < 7) {
    return {
      backgroundColor: "$blue2",
      accentColor: "$blue10",
    };
  }

  // This month (7-30 days) - neutral with subtle accent
  if (diffDays < 30) {
    return {
      backgroundColor: "$gray2",
      accentColor: "$gray10",
    };
  }

  // Older - minimal styling
  return {
    backgroundColor: "$background",
    accentColor: "$gray8",
  };
}

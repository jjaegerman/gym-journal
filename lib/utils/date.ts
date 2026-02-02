/**
 * Date formatting utilities
 */

/**
 * Format date with relative time if recent
 * @param date - Date to format
 * @returns Formatted date string
 * @example
 * formatRelativeDate(new Date()) // "Today, 2:30 PM"
 * formatRelativeDate(yesterday) // "Yesterday, 10:15 AM"
 * formatRelativeDate(lastWeek) // "Mon, Jan 15"
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  // Today
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${timeStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`;
  }

  // This week (within 7 days)
  if (diffDays < 7) {
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // This year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Older
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format duration in minutes to friendly string
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 * @example
 * formatDuration(45) // "45 min"
 * formatDuration(90) // "1h 30min"
 * formatDuration(125) // "2h 5min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}min`;
}

/**
 * Parse ISO 8601 duration string to minutes
 * @param isoDuration - ISO duration string (e.g., "PT30M", "PT1H30M")
 * @returns Duration in minutes
 */
export function parseIsoDuration(isoDuration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);

  if (!matches) {
    return 0;
  }

  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);

  return hours * 60 + minutes + Math.round(seconds / 60);
}

/**
 * Format ISO duration to friendly string
 * @param isoDuration - ISO duration string
 * @returns Formatted duration string
 */
export function formatIsoDuration(isoDuration: string): string {
  const minutes = parseIsoDuration(isoDuration);
  return formatDuration(minutes);
}

/**
 * Format milliseconds to stopwatch format (MM:SS)
 * @param millis - Duration in milliseconds
 * @returns Formatted stopwatch string
 * @example
 * formatStopwatch(0) // "00:00"
 * formatStopwatch(45000) // "00:45"
 * formatStopwatch(125000) // "02:05"
 * formatStopwatch(3661000) // "61:01"
 */
export function formatStopwatch(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Get month label for section headers
 * @param date - Date to format
 * @returns Month and year label (e.g., "January 2026")
 */
export function getMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * Get the start of the week (Sunday) for a given date
 */
function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart;
}

/**
 * Get week range label for grouping workouts
 * @param date - Any date within the week
 * @returns Week range string (e.g., "Jan 20–26" or "Jan 27 – Feb 2")
 */
export function getWeekRange(date: Date): string {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString(undefined, { month: "short" });
  const endMonth = weekEnd.toLocaleDateString(undefined, { month: "short" });

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()}–${weekEnd.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}`;
}

/**
 * Check if date is today or yesterday
 * @param date - Date to check
 * @returns "Today", "Yesterday", or null
 */
export function getSpecialDayLabel(date: Date): string | null {
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return null;
}

/**
 * Get unique week key for grouping (year + week number)
 * @param date - Date to get week key for
 * @returns Week key string (e.g., "2026-W05")
 */
export function getWeekKey(date: Date): string {
  const weekStart = getWeekStart(date);
  const year = weekStart.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const daysSinceStart = Math.floor(
    (weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

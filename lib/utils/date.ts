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
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return `Today, ${timeStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (diffDays === 1 || date.getDate() === yesterday.getDate()) {
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
 * Get time period label for grouping workouts
 * @param date - Date to categorize
 * @returns Period label
 */
export function getTimePeriodLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (diffDays === 1 || date.getDate() === yesterday.getDate()) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return "This Week";
  }

  if (diffDays < 14) {
    return "Last Week";
  }

  if (diffDays < 30) {
    return "This Month";
  }

  return "Earlier";
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

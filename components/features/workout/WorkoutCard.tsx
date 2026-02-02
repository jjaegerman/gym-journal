import { ChevronRight } from "@tamagui/lucide-icons";
import { ListItem } from "tamagui";
import { Workout } from "@/types/exercise";
import { formatRelativeDate, formatDuration } from "@/lib/utils";

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
}

/**
 * Individual workout card component
 * Displays workout summary with date, duration, and navigation
 */
export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  // Calculate workout duration in minutes
  const workoutDuration = Math.max(
    Math.round(
      (workout.mostRecentLog.getTime() - workout.datetime.getTime()) / 60000
    ),
    1
  );

  // Format datetime with relative dates
  const formattedDate = formatRelativeDate(workout.datetime);

  // Build first line: exercise count and duration
  const exerciseText =
    workout.exerciseCount === 1
      ? "1 exercise"
      : `${workout.exerciseCount} exercises`;

  const firstLine = `${exerciseText} • ${formatDuration(workoutDuration)}`;

  // Build second line: exercise preview and stats
  const secondLineParts: string[] = [];

  // Show up to 3 exercises with a visual separator
  if (workout.exercisePreview && workout.exercisePreview.length > 0) {
    const previewText = workout.exercisePreview.slice(0, 3).join(", ");
    secondLineParts.push(`• ${previewText}`);
  }

  // Add distance if present
  if (workout.totalDistance && workout.totalDistance > 0) {
    const unit = workout.distanceUnit || "mi";
    secondLineParts.push(`${workout.totalDistance.toFixed(1)} ${unit}`);
  }

  const secondLine = secondLineParts.join(" • ");

  const subtitle =
    secondLine.length > 0 ? `${firstLine}\n${secondLine}` : firstLine;

  return (
    <ListItem
      size="$4"
      hoverTheme
      pressTheme
      title={formattedDate}
      subTitle={subtitle}
      iconAfter={ChevronRight}
      onPress={onPress}
      paddingBlock="$3"
    />
  );
}

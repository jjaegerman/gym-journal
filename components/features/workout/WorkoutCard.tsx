import { ChevronRight } from "@tamagui/lucide-icons";
import { ListItem, ListItemSubtitle } from "tamagui";
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
  // Format datetime with relative dates
  const formattedDate = formatRelativeDate(workout.datetime);

  // Build first line: exercise count and duration
  const exerciseText =
    workout.exerciseCount === 1
      ? "1 exercise"
      : `${workout.exerciseCount} exercises`;

  const firstLine = `${exerciseText} • ${formatDuration(workout.durationMinutes)}`;

  // Build second line: exercise preview and stats
  const secondLineParts: string[] = [];

  // Show up to 3 exercises with a visual separator
  if (workout.exercisePreview && workout.exercisePreview.length > 0) {
    const previewText = workout.exercisePreview.slice(0, 3).join(", ");
    secondLineParts.push(previewText);
  }

  // Add distance if present
  if (workout.totalDistance && workout.totalDistance > 0) {
    const unit = workout.distanceUnit || "mi";
    secondLineParts.push(`${workout.totalDistance.toFixed(1)} ${unit}`);
  }

  const secondLine = secondLineParts.join(" • ");

  const subtitle = (
    <ListItemSubtitle ellipse={false} numberOfLines={0}>
      {secondLine.length > 0 ? `${firstLine}\n${secondLine}` : firstLine}
    </ListItemSubtitle>
  );

  return (
    <ListItem
      size="$4"
      $gtXs={{ size: "$6" }}
      hoverTheme
      pressTheme
      title={formattedDate}
      subTitle={subtitle}
      iconAfter={<ChevronRight size="$1.5" $gtXs={{ size: "$2" }} />}
      onPress={onPress}
      paddingBlock="$3"
    />
  );
}

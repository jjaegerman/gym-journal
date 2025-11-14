import { ChevronRight } from "@tamagui/lucide-icons";
import { ListItem, XStack, Paragraph, YStack } from "tamagui";
import { Workout } from "@/types/exercise";
import { formatRelativeDate, formatDuration, getWorkoutCardColors } from "@/lib/utils";

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
  const exerciseText = workout.exerciseCount === 1
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

  // Build stats (volume/distance)
  const statsParts: string[] = [];
  if (workout.totalVolume && workout.totalVolume > 0) {
    statsParts.push(`${Math.round(workout.totalVolume).toLocaleString()} lbs volume`);
  }

  if (workout.totalDistance && workout.totalDistance > 0) {
    const unit = workout.distanceUnit || "mi";
    statsParts.push(`${workout.totalDistance.toFixed(1)} ${unit}`);
  }

  // Combine exercise preview and stats with separator
  const secondLine = statsParts.length > 0
    ? [...secondLineParts, ...statsParts].join(" • ")
    : secondLineParts.join(" • ");

  const subtitle = secondLine.length > 0
    ? `${firstLine}\n${secondLine}`
    : firstLine;

  // Get colors based on recency
  const colors = getWorkoutCardColors(workout.datetime);

  return (
    <ListItem
      size="$4"
      hoverTheme
      pressTheme
      title={formattedDate}
      subTitle={subtitle}
      iconAfter={ChevronRight}
      onPress={onPress}
      backgroundColor={colors.backgroundColor}
      borderLeftWidth={3}
      borderLeftColor={colors.accentColor}
      paddingVertical="$3.5"
      titleProps={{
        fontWeight: "600",
        size: "$5",
      }}
      subTitleProps={{
        opacity: 0.7,
        marginTop: "$1",
      }}
    />
  );
}

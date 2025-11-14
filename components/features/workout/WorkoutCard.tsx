import { ChevronRight } from "@tamagui/lucide-icons";
import { ListItem, XStack, Paragraph } from "tamagui";
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

  // Build subtitle with exercise count and duration
  const exerciseText = workout.exerciseCount === 1
    ? "1 exercise"
    : `${workout.exerciseCount} exercises`;

  const subtitle = `${exerciseText} • ${formatDuration(workoutDuration)}`;

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

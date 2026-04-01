import { ChevronRight } from "@tamagui/lucide-icons";
import { ListItem, ListItemSubtitle, YStack } from "tamagui";
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

  const secondLine =
    workout.exercisePreview && workout.exercisePreview.length > 0
      ? workout.exercisePreview.slice(0, 3).join(", ")
      : "";

  const subtitle = (
    <YStack>
      <ListItemSubtitle ellipse={false} numberOfLines={0}>
        {firstLine}
      </ListItemSubtitle>
      {secondLine.length > 0 && (
        <ListItemSubtitle ellipse={false} numberOfLines={0}>
          {secondLine}
        </ListItemSubtitle>
      )}
    </YStack>
  );

  return (
    <ListItem
      size="$4"
      $sm={{ size: "$6" }}
      hoverTheme
      pressTheme
      title={formattedDate}
      subTitle={subtitle}
      iconAfter={<ChevronRight size="$1.5" $sm={{ size: "$2" }} />}
      onPress={onPress}
      paddingBlock="$3"
    />
  );
}

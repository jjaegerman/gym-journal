import { ChevronRight } from "@tamagui/lucide-icons";
import { ListItem } from "tamagui";
import { Workout } from "@/types/exercise";

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

  // Format datetime
  const formattedDate = workout.datetime.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ListItem
      size="$3"
      hoverTheme
      pressTheme
      title={formattedDate}
      subTitle={`Total Duration: ${workoutDuration} min`}
      iconAfter={ChevronRight}
      onPress={onPress}
    />
  );
}

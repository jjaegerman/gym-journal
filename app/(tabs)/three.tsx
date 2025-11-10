import { Spacer, YStack } from "tamagui";
import { WorkoutHistoryList } from "@/components/features/workout";
import { useWorkoutHistory } from "@/lib/hooks/useWorkoutHistory";

/**
 * Workout History Screen (Tab 3)
 * Displays a list of all user workouts
 */
export default function TabThreeScreen() {
  const { workouts, loading, error } = useWorkoutHistory();

  return (
    <YStack flex={1} items="center" gap="$1">
      <Spacer />
      <WorkoutHistoryList workouts={workouts} loading={loading} error={error} />
      <Spacer />
    </YStack>
  );
}

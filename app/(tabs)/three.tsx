import { Spacer, YStack } from "tamagui";
import { WorkoutHistoryList } from "@/components/features/workout";
import { useWorkoutHistory } from "@/lib/hooks/useWorkoutHistory";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

/**
 * Workout History Screen (Tab 3)
 * Displays a list of all user workouts
 * Refreshes data when tab comes into focus
 */
export default function TabThreeScreen() {
  const { workouts, loading, error, refetch } = useWorkoutHistory();
  const isFirstFocus = useRef(true);

  // Refetch workout data when this tab comes into focus (but skip the first mount)
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      console.log('Workout history tab focused - refetching...');
      refetch();
    }, []) // Empty deps - refetch is now stable
  );

  return (
    <YStack flex={1} items="center" gap="$1">
      <Spacer />
      <WorkoutHistoryList workouts={workouts} loading={loading} error={error} />
      <Spacer />
    </YStack>
  );
}

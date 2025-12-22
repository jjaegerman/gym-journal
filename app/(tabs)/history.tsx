import { Spacer, YStack, ScrollView } from "tamagui";
import { WorkoutHistoryList } from "@/components/features/workout";
import { useWorkoutHistory } from "@/lib/hooks/useWorkoutHistory";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { RefreshControl } from "react-native";

/**
 * Workout History Screen (Tab 3)
 * Displays a list of all user workouts
 * Refreshes data when tab comes into focus
 */
export default function TabThreeScreen() {
  const { workouts, loading, error, refetch } = useWorkoutHistory();
  const isFirstFocus = useRef(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refetch workout data when this tab comes into focus (but skip the first mount)
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetch();
    }, []) // Empty deps - refetch is now stable
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      flex={1}
      contentContainerStyle={{ grow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <YStack flex={1} items="center" gap="$1" bg="$background">
        <Spacer />
        <WorkoutHistoryList
          workouts={workouts}
          loading={loading}
          error={error}
        />
        <Spacer />
      </YStack>
    </ScrollView>
  );
}

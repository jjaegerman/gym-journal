import { YStack, Paragraph, View } from "tamagui";
import { WorkoutHistoryList, WorkoutFilters } from "@/components/features/workout";
import { useWorkoutHistory } from "@/lib/hooks/useWorkoutHistory";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

/**
 * Workout History Screen (Tab 3)
 * Displays a list of all user workouts with filtering
 * Refreshes data when tab comes into focus
 */
export default function TabThreeScreen() {
  const {
    workouts,
    loading,
    error,
    refetch,
    filters,
    setFilters,
    filterOptions,
    clearFilters,
    hasActiveFilters,
  } = useWorkoutHistory();
  const isFirstFocus = useRef(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetch();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const showEmptyFilterResult = hasActiveFilters && workouts?.length === 0 && !loading;

  return (
    <View flex={1} bg="$background">
      <YStack gap="$1" maxW={600} width="90%" mx="auto">
        <WorkoutFilters
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </YStack>
      {showEmptyFilterResult ? (
        <YStack py="$8" items="center">
          <Paragraph opacity={0.6}>
            No workouts match your filters
          </Paragraph>
        </YStack>
      ) : (
        <WorkoutHistoryList
          workouts={workouts}
          loading={loading}
          error={error}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </View>
  );
}

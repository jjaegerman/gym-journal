import { Spacer, YStack, ScrollView, Paragraph } from "tamagui";
import { WorkoutHistoryList, WorkoutFilters } from "@/components/features/workout";
import { useWorkoutHistory } from "@/lib/hooks/useWorkoutHistory";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { RefreshControl } from "react-native";

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
    <ScrollView
      flex={1}
      contentContainerStyle={{ grow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <YStack flex={1} items="center" gap="$1" bg="$background">
        <WorkoutFilters
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
        {showEmptyFilterResult ? (
          <YStack flex={1} justify="center" items="center" px="$4">
            <Paragraph opacity={0.6} text="center">
              No workouts match your filters
            </Paragraph>
          </YStack>
        ) : (
          <>
            <Spacer />
            <WorkoutHistoryList
              workouts={workouts}
              loading={loading}
              error={error}
            />
            <Spacer />
          </>
        )}
      </YStack>
    </ScrollView>
  );
}

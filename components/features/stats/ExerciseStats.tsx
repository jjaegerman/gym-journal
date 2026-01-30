import { ScrollView, YStack } from "tamagui";
import { useFilteredExerciseStats } from "@/lib/hooks";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { StatsFilters } from "./StatsFilters";
import { StatsDetailView } from "./StatsDetailView";
import { RefreshControl } from "react-native";
import { useState, useCallback, useRef } from "react";
import { useFocusEffect, router } from "expo-router";

/**
 * Exercise Stats Screen
 * Displays detailed stats for selected exercise(s) with filtering
 * Refreshes data when tab comes into focus
 */
export function ExerciseStats() {
  const {
    filters,
    setFilters,
    filterOptions,
    stats,
    loading,
    error,
    refetch,
    clearFilters,
    hasActiveFilters,
  } = useFilteredExerciseStats();

  const [refreshing, setRefreshing] = useState(false);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSessionPress = (workoutId: string) => {
    router.push(`/workout?workoutId=${workoutId}`);
  };

  const handleCategorySelect = (category: string) => {
    setFilters({ ...filters, categories: [category] });
  };

  if (loading && !stats) {
    return <LoadingState message="Loading exercise stats..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error loading stats"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <ScrollView
      flex={1}
      bg="$background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <YStack pb="$4" maxW={600} width="100%" self="center">
        <StatsFilters
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {stats ? (
          <YStack px="$4">
            <StatsDetailView
              stats={stats}
              onSessionPress={handleSessionPress}
              onCategorySelect={handleCategorySelect}
              availableCategories={filterOptions?.categories}
            />
          </YStack>
        ) : (
          <YStack flex={1} items="center" justify="center" py="$8">
            <LoadingState message="No exercise data" />
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}

import { ScrollView, YStack, View, Paragraph } from "tamagui";
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

  const handleExerciseKindSelect = (exercise_kind: string) => {
    setFilters({ ...filters, exercise_kinds: [exercise_kind] });
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
    <View flex={1} bg="$background">
      <YStack maxW={600} width="90%" mx="auto">
        <StatsFilters
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </YStack>
      <ScrollView
        flex={1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <YStack gap="$1" pb="$4" pt="$2" maxW={600} width="90%" mx="auto">
          {stats ? (
            <StatsDetailView
              stats={stats}
              onSessionPress={handleSessionPress}
              onExerciseKindSelect={handleExerciseKindSelect}
              availableExerciseKinds={filterOptions?.exercise_kinds}
            />
          ) : (
            <YStack flex={1} items="center" justify="center" py="$8">
              <Paragraph opacity={0.6}>No exercise data yet</Paragraph>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </View>
  );
}

import { ScrollView, YStack, H3, Paragraph } from "tamagui";
import { useExerciseStats } from "@/lib/hooks";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { ExerciseStatsCard } from "@/components/features/profile/ExerciseStatsCard";
import { RefreshControl } from "react-native";
import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Exercise Stats Screen
 * Displays per-exercise breakdown with all-time totals and trends
 * Refreshes data when tab comes into focus
 */
export function ExerciseStats() {
  const { exerciseStats, loading, error, refetch } = useExerciseStats();
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

  if (loading && exerciseStats.length === 0) {
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
      <YStack p="$4" gap="$4" maxW={800} width="100%" self="center">
        <YStack gap="$3">
          <H3>Exercise Stats</H3>
          <Paragraph opacity={0.7} size="$2">
            All-time totals and recent 4-week trends
          </Paragraph>
        </YStack>

        {exerciseStats.length > 0 ? (
          <YStack gap="$3">
            {exerciseStats.map((exercise) => (
              <ExerciseStatsCard
                key={`${exercise.category}-${JSON.stringify(
                  exercise.modifiers
                )}-${exercise.equipment}`}
                exercise={exercise}
              />
            ))}
          </YStack>
        ) : (
          <Paragraph opacity={0.5} text="center" py="$6">
            No exercise data available yet
          </Paragraph>
        )}
      </YStack>
    </ScrollView>
  );
}

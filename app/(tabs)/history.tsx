import { YStack, Paragraph, View, Button, XStack, Text } from "tamagui";
import { ArrowDownUp } from "@tamagui/lucide-icons";
import { Platform } from "react-native";
import { WorkoutHistoryList, WorkoutFilters } from "@/components/features/workout";
import { useWorkoutHistory } from "@/lib/hooks/useWorkoutHistory";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

/**
 * Workout History Screen (Tab 3)
 * Displays a list of all user workouts with filtering and infinite scroll.
 * Refreshes data when tab comes into focus.
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
    hasMore,
    loadMore,
    loadingMore,
    sortAscending,
    toggleSortOrder,
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
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const showEmptyFilterResult = hasActiveFilters && workouts?.length === 0 && !loading;

  return (
    <View flex={1} bg="$background">
      <XStack width="90%" $sm={{ width: "75%" }} $md={{ width: "65%" }} mx="auto" items="center">
        <YStack flex={1}>
          <WorkoutFilters
            filters={filters}
            filterOptions={filterOptions}
            onFiltersChange={setFilters}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </YStack>
        <Button
          size="$3"
          $sm={{ size: "$5" }}
          chromeless
          onPress={toggleSortOrder}
          borderRadius="$10"
          px="$2"
          icon={<ArrowDownUp size={Platform.isPad ? 20 : 14} color="$gray11" />}
        >
          <Text fontSize="$3" $sm={{ fontSize: "$5" }} color="$gray11">
            {sortAscending ? "Oldest" : "Newest"}
          </Text>
        </Button>
      </XStack>
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
          onLoadMore={loadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
          sortAscending={sortAscending}
        />
      )}
    </View>
  );
}

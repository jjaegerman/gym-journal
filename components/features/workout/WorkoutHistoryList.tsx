import { router } from "expo-router";
import { Separator, YGroup, YStack, H5 } from "tamagui";
import { Workout } from "@/types/exercise";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutEmptyState } from "./WorkoutEmptyState";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { getTimePeriodLabel } from "@/lib/utils";

interface WorkoutHistoryListProps {
  workouts: Workout[] | null;
  loading?: boolean;
  error?: Error | null;
}

/**
 * Workout History List Component
 * Displays a list of workouts or appropriate empty/loading states
 * Only shows loading state on initial load, subsequent loads update silently
 */
export function WorkoutHistoryList({
  workouts,
  loading = false,
  error,
}: WorkoutHistoryListProps) {
  const handleWorkoutPress = (workoutId: string) => {
    router.setParams({ workoutId });
    router.push(`/workout?workoutId=${workoutId}`);
  };

  // Only show loading state if we don't have any data yet
  if (loading && !workouts) {
    return <LoadingState message="Loading workouts..." />;
  }

  if (error) {
    return (
      <ErrorState title="Error loading workouts" message={error.message} />
    );
  }

  if (!workouts || workouts.length === 0) {
    return <WorkoutEmptyState />;
  }

  // Group workouts by time period
  const groupedWorkouts: { [key: string]: Workout[] } = {};
  const periodOrder: string[] = [];

  workouts.forEach((workout) => {
    const period = getTimePeriodLabel(workout.datetime);
    if (!groupedWorkouts[period]) {
      groupedWorkouts[period] = [];
      periodOrder.push(period);
    }
    groupedWorkouts[period].push(workout);
  });

  return (
    <YStack width="90%" maxW={600} gap="$4">
      {periodOrder.map((period) => (
        <YStack key={period} gap="$2">
          <H5 paddingInline="$3" opacity={0.7} fontWeight="600">
            {period}
          </H5>
          <YGroup
            bordered
            separator={<Separator />}
            rounded="$4"
            overflow="hidden"
          >
            {groupedWorkouts[period].map((workout) => (
              <YGroup.Item key={workout.id}>
                <WorkoutCard
                  workout={workout}
                  onPress={() => handleWorkoutPress(workout.id)}
                />
              </YGroup.Item>
            ))}
          </YGroup>
        </YStack>
      ))}
    </YStack>
  );
}

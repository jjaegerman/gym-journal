import { router } from "expo-router";
import { Separator, YGroup } from "tamagui";
import { Workout } from "@/types/exercise";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutEmptyState } from "./WorkoutEmptyState";
import { LoadingState, ErrorState } from "@/components/ui/feedback";

interface WorkoutHistoryListProps {
  workouts: Workout[] | null;
  loading?: boolean;
  error?: Error | null;
}

/**
 * Workout History List Component
 * Displays a list of workouts or appropriate empty/loading states
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

  if (loading) {
    return <LoadingState message="Loading workouts..." />;
  }

  if (error) {
    return <ErrorState title="Error loading workouts" message={error.message} />;
  }

  if (!workouts || workouts.length === 0) {
    return <WorkoutEmptyState />;
  }

  return (
    <YGroup items="center" bordered width="60%" separator={<Separator />}>
      {workouts.map((workout) => (
        <YGroup.Item key={workout.id}>
          <WorkoutCard
            workout={workout}
            onPress={() => handleWorkoutPress(workout.id)}
          />
        </YGroup.Item>
      ))}
    </YGroup>
  );
}

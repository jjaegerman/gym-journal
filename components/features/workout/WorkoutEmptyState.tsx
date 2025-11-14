import { EmptyState } from "@/components/ui/feedback";

/**
 * Empty state component shown when no workouts exist
 */
export function WorkoutEmptyState() {
  return (
    <EmptyState
      title="No Workouts Yet"
      description="Start tracking your fitness journey! Go to the Record tab to log your first workout."
    />
  );
}

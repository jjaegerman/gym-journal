import { EmptyState } from "@/components/ui/feedback";

/**
 * Empty state component shown when no workouts exist
 */
export function WorkoutEmptyState() {
  return (
    <EmptyState
      title="No workouts found"
      description="Start recording your first workout to see your history here"
    />
  );
}

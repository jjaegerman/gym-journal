import { useEffect, useState } from "react";
import { Button, H5, Paragraph, XStack, YStack } from "tamagui";
import { Plus } from "@tamagui/lucide-icons";
import { WorkoutDetails, WorkoutDetailsSchema } from "@/types/exercise";
import { getWorkoutDetails } from "@/lib/api/supabase/workouts";
import { ExerciseList } from "./shared/ExerciseList";
import { AddSetsSheet } from "./features/workout/AddSetsSheet";
import { LoadingState } from "./ui/feedback/LoadingState";

export const WorkoutView = ({ workoutId }: { workoutId: string }) => {
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [addSetsOpen, setAddSetsOpen] = useState(false);

  const fetchWorkout = async () => {
    try {
      setLoading(true);
      const data = await getWorkoutDetails(workoutId);
      setWorkout(WorkoutDetailsSchema.parse(data));
    } catch (err) {
      console.error("Failed to load workout", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkout();
  }, [workoutId]);

  const endTime = workout?.endTime;
  const workoutStart = workout?.datetime;
  const showEndTime =
    endTime && workoutStart && endTime.getTime() !== workoutStart.getTime();

  if (loading) {
    return <LoadingState />;
  }

  return (
    <YStack width="90%" $gtXs={{ width: "75%" }} $gtMd={{ width: "65%" }} gap="$4" mx="auto" pb="$4" pt="$4">
      <YStack paddingInline="$3" gap="$1">
        <H5 opacity={0.7} fontWeight="600" $gtXs={{ fontSize: "$8" }}>
          {workout?.datetime.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </H5>
        <Paragraph opacity={0.5} $gtXs={{ fontSize: "$6" }}>
          {workout?.datetime.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {showEndTime && (
            <>
              {" to "}
              {endTime.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
        </Paragraph>
      </YStack>
      {workout && (
        <XStack justify="flex-end" paddingInline="$3">
          <Button
            size="$3"
            $gtXs={{ size: "$5" }}
            icon={Plus}
            onPress={() => setAddSetsOpen(true)}
            variant="outlined"
            borderColor="$color5"
            borderWidth={0.5}
          >
            Add Sets
          </Button>
        </XStack>
      )}
      <ExerciseList
        exercises={workout?.exercises ?? []}
        onLogDeleted={fetchWorkout}
      />
      {workout && (
        <AddSetsSheet
          workoutId={workoutId}
          workoutDatetime={workout.datetime}
          workoutEndTime={workout.endTime}
          exercises={workout.exercises}
          open={addSetsOpen}
          onClose={() => setAddSetsOpen(false)}
          onSetsAdded={fetchWorkout}
        />
      )}
    </YStack>
  );
};

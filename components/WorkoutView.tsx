import { useEffect, useState } from "react";
import { H5, YStack } from "tamagui";
import { WorkoutDetails, WorkoutDetailsSchema } from "@/types/exercise";
import { getWorkoutDetails } from "@/lib/api/supabase/workouts";
import { ExerciseList } from "./shared/ExerciseList";

export const WorkoutView = ({ workoutId }: { workoutId: string }) => {
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);

  const fetchWorkout = async () => {
    try {
      const data = await getWorkoutDetails(workoutId);
      setWorkout(WorkoutDetailsSchema.parse(data));
    } catch {}
  };

  useEffect(() => {
    fetchWorkout();
  }, [workoutId]);

  const endTime = workout?.endTime;
  const workoutStart = workout?.datetime;
  const showEndTime =
    endTime && workoutStart && endTime.getTime() !== workoutStart.getTime();

  return (
    <YStack width="90%" maxW={600} gap="$4" mx="auto" pb="$4" pt="$4">
      <H5 paddingInline="$3" opacity={0.7} fontWeight="600">
        {workout?.datetime.toLocaleString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {showEndTime && (
          <>
            {" "}
            to{" "}
            {endTime.toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        )}
      </H5>
      <ExerciseList
        exercises={workout?.exercises ?? []}
        onLogDeleted={fetchWorkout}
      />
    </YStack>
  );
};

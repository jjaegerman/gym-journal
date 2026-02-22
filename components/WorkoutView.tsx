import { Session } from "@supabase/supabase-js";
import { supabase } from "lib/supabase";
import { useEffect, useState } from "react";
import { H5, YStack } from "tamagui";
import {
  Exercise,
  WorkoutDetails,
  WorkoutDetailsSchema,
} from "types/exercise";
import { ExerciseList } from "./shared/ExerciseList";

export const WorkoutView = ({ workoutId }: { workoutId: string }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [workout, setWorkout] = useState<WorkoutDetails | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session) {
      getWorkout();
    }
  }, [session]);

  const getWorkout = async () => {
    const { data, error } = await supabase.rpc("get_workout_details", {
      p_workout_id: workoutId,
    });
    if (error) {
      console.error("Error fetching workout details:", error);
      return;
    }
    setWorkout(WorkoutDetailsSchema.parse(data));
  };

  const lastLog = workout ? lastLogTime(workout.exercises) : undefined;
  const workoutStart = workout?.datetime;
  const showEndTime =
    lastLog && workoutStart && lastLog.getTime() !== workoutStart.getTime();

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
            {lastLog?.toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        )}
      </H5>
      <ExerciseList
        exercises={workout?.exercises ?? []}
        onLogDeleted={getWorkout}
      />
    </YStack>
  );
};

function lastLogTime(exercises: Exercise[] | undefined): Date | undefined {
  if (!exercises || exercises.length === 0) {
    return undefined;
  }
  let lastTime: Date | null = null;
  exercises.forEach((exercise) => {
    exercise.logs.forEach((log) => {
      const logTime = new Date(log.datetime);
      if (!lastTime || logTime > lastTime) {
        lastTime = logTime;
      }
    });
  });
  return lastTime || undefined;
}

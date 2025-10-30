import { Session } from "@supabase/supabase-js";
import { supabase } from "lib/supabase";
import { useEffect, useState } from "react";
import { View, Text, Sheet } from "tamagui";
import { Workout, WorkoutDetails, WorkoutDetailsSchema } from "types/exercise";

const spModes = ["percent", "constant", "fit", "mixed"] as const;

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

  return (
    <View>
      <Text>This is the workout view content for workout {workoutId}.</Text>
    </View>
  );
};

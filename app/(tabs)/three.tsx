import { Session } from "@supabase/supabase-js";
import { ChevronRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import { supabase } from "lib/supabase";
import { useEffect, useState } from "react";
import { Heading, ListItem, Separator, Spacer, YGroup, YStack } from "tamagui";
import { Workout, WorkoutsArraySchema } from "types/exercise";

export default function TabThreeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);

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
      getWorkouts();
    }
  }, [session]);

  const getWorkouts = async () => {
    const { data, error } = await supabase.rpc("get_user_workouts", {
      p_user_id: session?.user.id,
    });
    if (error) {
      console.error("Error fetching workouts:", error);
      return;
    }
    setWorkouts(WorkoutsArraySchema.parse(data));
  };

  return (
    <YStack flex={1} items="center" gap="$1">
      <Spacer />
      <YGroup items="center" bordered width="60%" separator={<Separator />}>
        {workouts?.map((workout) => {
          const workoutDuration = Math.max(
            Math.round(
              (workout.mostRecentLog.getTime() - workout.datetime.getTime()) /
                60000
            ),
            1
          );
          return (
            <YGroup.Item key={workout.id}>
              <ListItem
                size="$3"
                hoverTheme
                pressTheme
                key={workout.id}
                title={workout.datetime.toLocaleString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                subTitle={`Total Duration: ${workoutDuration} min`}
                iconAfter={ChevronRight}
                onPress={() => {
                  router.setParams({ workoutId: workout.id });
                  router.push(`/workout?workoutId=${workout.id}`);
                }}
              />
            </YGroup.Item>
          );
        })}
      </YGroup>
    </YStack>
  );
}

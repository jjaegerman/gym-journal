import { WorkoutView } from "components/WorkoutView";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { PortalProvider, ScrollView } from "tamagui";
import { track } from "@/lib/analytics/track";

const WorkoutScreen = () => {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  useEffect(() => {
    if (workoutId) track("workout_viewed", { workout_id: workoutId });
  }, [workoutId]);

  return (
    <PortalProvider>
      <ScrollView flex={1} bg="$background">
        <WorkoutView workoutId={workoutId} />
      </ScrollView>
    </PortalProvider>
  );
};

export default WorkoutScreen;

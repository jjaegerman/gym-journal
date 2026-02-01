import { WorkoutView } from "components/WorkoutView";
import { useLocalSearchParams } from "expo-router";
import { PortalProvider, ScrollView } from "tamagui";

const WorkoutScreen = () => {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return (
    <PortalProvider>
      <ScrollView flex={1} bg="$background">
        <WorkoutView workoutId={workoutId} />
      </ScrollView>
    </PortalProvider>
  );
};

export default WorkoutScreen;

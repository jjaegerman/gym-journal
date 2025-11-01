import { WorkoutView } from "components/WorkoutView";
import { useLocalSearchParams } from "expo-router";
import { PortalProvider, View, XStack } from "tamagui";

const WorkoutScreen = () => {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return (
    <PortalProvider>
      <View flex={1}>
        <WorkoutView workoutId={workoutId} />
      </View>
    </PortalProvider>
  );
};

export default WorkoutScreen;

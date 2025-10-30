import { WorkoutView } from "components/WorkoutView";
import { useLocalSearchParams } from "expo-router";

const WorkoutScreen = () => {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  return <WorkoutView workoutId={workoutId} />;
};

export default WorkoutScreen;

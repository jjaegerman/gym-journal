import { useLocalSearchParams } from "expo-router";
import { PortalProvider, ScrollView } from "tamagui";
import { WorkoutView } from "@/components/WorkoutView";
import { getPublicWorkoutDetails } from "@/lib/api/supabase/public";

/**
 * Public read-only workout page. Accessible to anyone with the workout UUID.
 * Powers iOS Universal Links / Android App Links for `gym-journal.com/share/workout/<uuid>`.
 */
export default function SharedWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PortalProvider>
      <ScrollView flex={1} bg="$background">
        <WorkoutView
          workoutId={id}
          readonly
          fetchFn={getPublicWorkoutDetails}
        />
      </ScrollView>
    </PortalProvider>
  );
}

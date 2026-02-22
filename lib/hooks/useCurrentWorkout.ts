import { useEffect, useState, useCallback } from "react";
import { WorkoutDetails, WorkoutDetailsSchema } from "@/types/exercise";
import { getUserWorkouts, getWorkoutDetails } from "@/lib/api/supabase/workouts";
import { useSession } from "./useSession";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function useCurrentWorkout() {
  const { session } = useSession();
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentWorkout = useCallback(async () => {
    if (!session?.user.id) {
      setCurrentWorkout(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const workouts = await getUserWorkouts();

      if (workouts.length === 0) {
        setCurrentWorkout(null);
        return;
      }

      const mostRecent = workouts[0];
      const timeSinceLastLog = Date.now() - new Date(mostRecent.mostRecentLog).getTime();

      if (timeSinceLastLog > ONE_HOUR_MS) {
        setCurrentWorkout(null);
        return;
      }

      const details = await getWorkoutDetails(mostRecent.id);
      setCurrentWorkout(WorkoutDetailsSchema.parse(details));
    } catch (err) {
      console.error("Error fetching current workout:", err);
      setCurrentWorkout(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    fetchCurrentWorkout();
  }, [fetchCurrentWorkout]);

  return {
    currentWorkout,
    loading,
    refetch: fetchCurrentWorkout,
  };
}

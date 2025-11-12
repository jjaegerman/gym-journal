import { useEffect, useState, useCallback, useRef } from 'react';
import { Workout, WorkoutsArraySchema } from '@/types/exercise';
import { getUserWorkouts } from '@/lib/api/supabase/workouts';
import { useSession } from './useSession';

/**
 * Custom hook to fetch and manage workout history
 * Handles session management and data fetching
 */
export function useWorkoutHistory() {
  const { session } = useSession();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to keep stable refetch function
  const fetchWorkoutsRef = useRef<() => Promise<void> | undefined>(undefined);

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getUserWorkouts(session.user.id);
      setWorkouts(WorkoutsArraySchema.parse(data));
    } catch (err) {
      console.error("Error fetching workouts:", err);
      setError(err as Error);
      setWorkouts(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  // Store the latest version in ref
  fetchWorkoutsRef.current = fetchWorkouts;

  // Fetch workouts when session changes
  useEffect(() => {
    if (session) {
      fetchWorkouts();
    } else {
      setWorkouts(null);
      setLoading(false);
    }
  }, [session, fetchWorkouts]);

  // Return a stable refetch function
  const stableRefetch = useCallback(() => {
    return fetchWorkoutsRef.current?.() ?? Promise.resolve();
  }, []);

  return {
    workouts,
    loading,
    error,
    refetch: stableRefetch,
  };
}

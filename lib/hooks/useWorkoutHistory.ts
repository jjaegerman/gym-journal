import { useEffect, useState, useCallback, useRef } from 'react';
import { Workout, WorkoutsArraySchema } from '@/types/exercise';
import {
  getUserWorkouts,
  getWorkoutFilterOptions,
  filterUserWorkouts,
  WorkoutFilterOptions,
  WorkoutFilters,
} from '@/lib/api/supabase/workouts';
import { useSession } from './useSession';

export type { WorkoutFilterOptions, WorkoutFilters };

/**
 * Custom hook to fetch and manage workout history with filtering
 */
export function useWorkoutHistory() {
  const { session } = useSession();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [filters, setFilters] = useState<WorkoutFilters>({});
  const [filterOptions, setFilterOptions] = useState<WorkoutFilterOptions | null>(null);

  const fetchWorkoutsRef = useRef<() => Promise<void> | undefined>(undefined);

  const hasActiveFilters = useCallback(() => {
    return !!(
      (filters.categories && filters.categories.length > 0) ||
      (filters.equipment && filters.equipment.length > 0) ||
      filters.dateFrom ||
      filters.dateTo
    );
  }, [filters]);

  const fetchWorkouts = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      setLoading(true);
      setError(null);

      let data: Workout[];
      if (hasActiveFilters()) {
        data = await filterUserWorkouts(filters);
      } else {
        data = await getUserWorkouts();
      }

      setWorkouts(WorkoutsArraySchema.parse(data));
    } catch (err) {
      console.error("Error fetching workouts:", err);
      setError(err as Error);
      setWorkouts(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, filters, hasActiveFilters]);

  const fetchFilterOptions = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      const options = await getWorkoutFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  }, [session?.user.id]);

  fetchWorkoutsRef.current = fetchWorkouts;

  useEffect(() => {
    if (session) {
      fetchFilterOptions();
    }
  }, [session, fetchFilterOptions]);

  useEffect(() => {
    if (session) {
      fetchWorkouts();
    } else {
      setWorkouts(null);
      setLoading(false);
    }
  }, [session, fetchWorkouts]);

  const stableRefetch = useCallback(() => {
    return fetchWorkoutsRef.current?.() ?? Promise.resolve();
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    workouts,
    loading,
    error,
    refetch: stableRefetch,
    filters,
    setFilters,
    filterOptions,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
  };
}

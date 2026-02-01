import { useEffect, useState, useCallback, useRef } from 'react';
import { Workout, WorkoutsArraySchema } from '@/types/exercise';
import {
  getUserWorkouts,
  getWorkoutFilterRelationships,
  filterUserWorkouts,
  WorkoutFilterOptions,
  WorkoutFilters,
  WorkoutFilterRelationship,
} from '@/lib/api/supabase/workouts';
import { useSession } from './useSession';

export type { WorkoutFilterOptions, WorkoutFilters };

/**
 * Compute cascaded filter options for workouts (category + equipment only)
 */
function computeWorkoutCascadedOptions(
  relationships: WorkoutFilterRelationship[],
  selectedCategories?: string[],
  selectedEquipment?: string[]
): WorkoutFilterOptions {
  // Categories: if equipment selected, show only categories that use that equipment
  const categories = [...new Set(
    (selectedEquipment?.length
      ? relationships.filter(r => r.equipment !== null && selectedEquipment.includes(r.equipment))
      : relationships
    ).map(r => r.category)
  )].sort();

  // Equipment: if categories selected, show only equipment used by those categories
  const equipment = [...new Set(
    (selectedCategories?.length
      ? relationships.filter(r => selectedCategories.includes(r.category))
      : relationships
    ).filter(r => r.equipment !== null).map(r => r.equipment!)
  )].sort();

  return { categories, equipment };
}

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
  const [relationships, setRelationships] = useState<WorkoutFilterRelationship[]>([]);

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

  // Fetch relationships once on mount
  const fetchRelationships = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      const data = await getWorkoutFilterRelationships();
      setRelationships(data);

      // Compute initial options from relationships
      const options = computeWorkoutCascadedOptions(data);
      setFilterOptions(options);
    } catch (err) {
      console.error("Error fetching filter relationships:", err);
    }
  }, [session?.user.id]);

  fetchWorkoutsRef.current = fetchWorkouts;

  // Fetch relationships once on mount
  useEffect(() => {
    if (session) {
      fetchRelationships();
    }
  }, [session, fetchRelationships]);

  // Compute cascaded options when filters change (no API call)
  useEffect(() => {
    if (relationships.length === 0) return;

    const options = computeWorkoutCascadedOptions(
      relationships,
      filters.categories,
      filters.equipment
    );
    setFilterOptions(options);
  }, [relationships, filters.categories, filters.equipment]);

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

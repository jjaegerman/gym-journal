import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Workout, WorkoutsArraySchema } from '@/types/exercise';
import {
  getWorkoutFilterRelationships,
  getUserWorkouts,
  filterUserWorkouts,
  WorkoutFilterOptions,
  WorkoutFilters,
  WorkoutFilterRelationship,
  PAGE_SIZE,
} from '@/lib/api/supabase/workouts';
import { useSession } from './useSession';

export type { WorkoutFilterOptions, WorkoutFilters };

/**
 * Compute cascaded filter options for workouts (exercise_kind + equipment only)
 */
function computeWorkoutCascadedOptions(
  relationships: WorkoutFilterRelationship[],
  selectedExerciseKinds?: string[],
  selectedEquipment?: string[]
): WorkoutFilterOptions {
  const exercise_kinds = [...new Set(
    (selectedEquipment?.length
      ? relationships.filter(r => r.equipment !== null && selectedEquipment.includes(r.equipment))
      : relationships
    ).map(r => r.exercise_kind)
  )].sort();

  const equipment = [...new Set(
    (selectedExerciseKinds?.length
      ? relationships.filter(r => selectedExerciseKinds.includes(r.exercise_kind))
      : relationships
    ).filter(r => r.equipment !== null).map(r => r.equipment!)
  )].sort();

  return { exercise_kinds, equipment };
}

/**
 * Custom hook for workout history with offset-based pagination
 * and exercise/equipment filters.
 */
export function useWorkoutHistory() {
  const { session } = useSession();
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filters, setFilters] = useState<WorkoutFilters>({});
  const [filterOptions, setFilterOptions] = useState<WorkoutFilterOptions | null>(null);
  const [relationships, setRelationships] = useState<WorkoutFilterRelationship[]>([]);
  const [sortAscending, setSortAscending] = useState(false);

  const [refetchKey, setRefetchKey] = useState(0);

  const loadingMoreRef = useRef(false);

  const hasActiveFilters = useMemo(() =>
    !!(filters.exercise_kinds?.length || filters.equipment?.length),
    [filters]
  );

  // Full refetch whenever filters, sort order, or refetchKey change
  useEffect(() => {
    if (!session?.user.id) {
      setWorkouts(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchInitial = async () => {
      setLoading(true);
      setError(null);
      setPage(0);

      try {
        if (hasActiveFilters) {
          const data = await filterUserWorkouts(filters, sortAscending);
          const parsed = WorkoutsArraySchema.parse(data);
          if (!cancelled) {
            setWorkouts(parsed);
            setHasMore(false);
          }
        } else {
          const data = await getUserWorkouts(0, sortAscending);
          const parsed = WorkoutsArraySchema.parse(data);
          if (!cancelled) {
            setWorkouts(parsed);
            setHasMore(parsed.length >= PAGE_SIZE);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching workouts:", err);
          setError(err as Error);
          setWorkouts(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInitial();
    return () => { cancelled = true; };
  }, [session?.user.id, filters, sortAscending, refetchKey]);

  // Fetch relationships once on mount
  useEffect(() => {
    if (!session?.user.id) return;

    const fetchMeta = async () => {
      try {
        const rels = await getWorkoutFilterRelationships();
        setRelationships(rels);
        setFilterOptions(computeWorkoutCascadedOptions(rels));
      } catch (err) {
        console.error("Error fetching filter metadata:", err);
      }
    };

    fetchMeta();
  }, [session?.user.id]);

  // Compute cascaded options when filters change (no API call)
  useEffect(() => {
    if (relationships.length === 0) return;
    setFilterOptions(computeWorkoutCascadedOptions(
      relationships,
      filters.exercise_kinds,
      filters.equipment
    ));
  }, [relationships, filters.exercise_kinds, filters.equipment]);

  const loadMore = useCallback(async () => {
    if (!session?.user.id || loadingMoreRef.current || !hasMore || hasActiveFilters) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const data = await getUserWorkouts(nextPage, sortAscending);
      const parsed = WorkoutsArraySchema.parse(data);

      if (parsed.length > 0) {
        setWorkouts(prev => prev ? [...prev, ...parsed] : parsed);
        setPage(nextPage);
        setHasMore(parsed.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more workouts:", err);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [session?.user.id, hasMore, hasActiveFilters, page, sortAscending]);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortAscending(prev => !prev);
  }, []);

  const refetch = useCallback(() => {
    setRefetchKey(k => k + 1);
  }, []);

  return {
    workouts,
    loading,
    error,
    refetch,
    filters,
    setFilters,
    filterOptions,
    clearFilters,
    hasActiveFilters,
    hasMore,
    loadMore,
    loadingMore,
    sortAscending,
    toggleSortOrder,
  };
}

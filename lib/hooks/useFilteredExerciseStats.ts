import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getExerciseFilterOptions,
  getCascadedFilterOptions,
  getFilteredExerciseStats,
  ExerciseFilterOptions,
  ExerciseFilters,
  FilteredExerciseStats,
  AppliedFilters,
} from '@/lib/api/supabase/stats';
import { useSession } from './useSession';

export type { ExerciseFilterOptions, ExerciseFilters, FilteredExerciseStats, AppliedFilters };

/**
 * Custom hook for filtered exercise stats with progress data
 */
export function useFilteredExerciseStats() {
  const { session } = useSession();
  const [filters, setFilters] = useState<ExerciseFilters>({
    timeRange: 'all_time',
  });
  const [filterOptions, setFilterOptions] = useState<ExerciseFilterOptions | null>(null);
  const [stats, setStats] = useState<FilteredExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatsRef = useRef<() => Promise<void> | undefined>(undefined);

  const hasActiveFilters = useCallback(() => {
    return !!(
      (filters.categories && filters.categories.length > 0) ||
      (filters.modifiers && filters.modifiers.length > 0) ||
      (filters.equipment && filters.equipment.length > 0)
    );
  }, [filters]);

  const fetchStats = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getFilteredExerciseStats(filters);
      setStats(data);

      // Sync UI filters with applied filters from server (for auto-selection)
      if (data.appliedFilters && !hasActiveFilters()) {
        const applied = data.appliedFilters;
        const needsSync =
          (applied.categories?.length > 0 && !filters.categories?.length) ||
          (applied.equipment?.length > 0 && !filters.equipment?.length);

        if (needsSync) {
          setFilters((prev) => ({
            ...prev,
            categories: applied.categories?.length > 0 ? applied.categories : prev.categories,
            equipment: applied.equipment?.length > 0 ? applied.equipment : prev.equipment,
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching filtered exercise stats:", err);
      setError(err as Error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, filters, hasActiveFilters]);

  const fetchFilterOptions = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      const options = await getExerciseFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error("Error fetching exercise filter options:", err);
    }
  }, [session?.user.id]);

  // Fetch cascaded filter options when category changes
  const fetchCascadedOptions = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      const options = await getCascadedFilterOptions({
        categories: filters.categories,
        equipment: filters.equipment,
      });
      setFilterOptions(options);
    } catch (err) {
      console.error("Error fetching cascaded filter options:", err);
    }
  }, [session?.user.id, filters.categories, filters.equipment]);

  fetchStatsRef.current = fetchStats;

  // Initial load: get all filter options
  useEffect(() => {
    if (session) {
      fetchFilterOptions();
    }
  }, [session, fetchFilterOptions]);

  // When categories change: get cascaded options
  useEffect(() => {
    if (session && filters.categories?.length) {
      fetchCascadedOptions();
    } else if (session && !filters.categories?.length) {
      // Reset to all options when no category selected
      fetchFilterOptions();
    }
  }, [session, filters.categories, fetchCascadedOptions, fetchFilterOptions]);

  useEffect(() => {
    if (session) {
      fetchStats();
    } else {
      setStats(null);
      setLoading(false);
    }
  }, [session, fetchStats]);

  const stableRefetch = useCallback(() => {
    return fetchStatsRef.current?.() ?? Promise.resolve();
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ timeRange: 'all_time' });
  }, []);

  return {
    filters,
    setFilters,
    filterOptions,
    stats,
    loading,
    error,
    refetch: stableRefetch,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
  };
}

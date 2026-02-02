import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getFilterRelationships,
  getFilteredExerciseStats,
  ExerciseFilterOptions,
  ExerciseFilters,
  FilteredExerciseStats,
  AppliedFilters,
  FilterRelationship,
} from '@/lib/api/supabase/stats';
import { computeCascadedOptions } from '@/lib/utils/filterCascade';
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
  const [relationships, setRelationships] = useState<FilterRelationship[]>([]);
  const [stats, setStats] = useState<FilteredExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatsRef = useRef<() => Promise<void> | undefined>(undefined);

  const hasActiveFilters = useCallback(() => {
    return !!(
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

  // Fetch relationships once on mount
  const fetchRelationships = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      const data = await getFilterRelationships();
      setRelationships(data);

      // Compute initial options from relationships
      const options = computeCascadedOptions(data);
      setFilterOptions({
        categories: options.categories,
        modifiers: options.modifiers,
        equipment: options.equipment,
      });
    } catch (err) {
      console.error("Error fetching filter relationships:", err);
    }
  }, [session?.user.id]);

  fetchStatsRef.current = fetchStats;

  // Fetch relationships once on mount
  useEffect(() => {
    if (session) {
      fetchRelationships();
    }
  }, [session, fetchRelationships]);

  // Compute cascaded options when filters change (no API call)
  useEffect(() => {
    if (relationships.length === 0) return;

    const options = computeCascadedOptions(
      relationships,
      filters.categories,
      filters.equipment,
      filters.modifiers
    );
    setFilterOptions({
      categories: options.categories,
      modifiers: options.modifiers,
      equipment: options.equipment,
    });
  }, [relationships, filters.categories, filters.equipment, filters.modifiers]);

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
    setFilters((prev) => ({
      categories: prev.categories,
      timeRange: 'all_time',
    }));
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

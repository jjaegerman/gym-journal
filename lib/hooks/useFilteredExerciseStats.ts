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
import { useUnitPreferences } from './useUnitPreferences';

export type { ExerciseFilterOptions, ExerciseFilters, FilteredExerciseStats, AppliedFilters };

/**
 * Custom hook for filtered exercise stats with progress data
 */
export function useFilteredExerciseStats() {
  const { session } = useSession();
  const { prefs } = useUnitPreferences();
  const [filters, setFilters] = useState<ExerciseFilters>({
    timeRange: 'all_time',
  });
  const [filterOptions, setFilterOptions] = useState<ExerciseFilterOptions | null>(null);
  const [relationships, setRelationships] = useState<FilterRelationship[]>([]);
  const [stats, setStats] = useState<FilteredExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchStatsRef = useRef<() => Promise<void> | undefined>(undefined);
  const fetchGenerationRef = useRef(0);

  const hasActiveFilters = useCallback(() => {
    return !!(
      (filters.modifiers && filters.modifiers.length > 0) ||
      (filters.equipment && filters.equipment.length > 0) ||
      (filters.timeRange && filters.timeRange !== 'all_time')
    );
  }, [filters]);

  const fetchStats = useCallback(async () => {
    if (!session?.user.id) return;

    const generation = ++fetchGenerationRef.current;

    try {
      setLoading(true);
      setError(null);

      const data = await getFilteredExerciseStats({
        ...filters,
        preferredWeightUnit: prefs.weightUnit,
        preferredDistanceUnit: prefs.distanceUnit,
      });

      if (fetchGenerationRef.current !== generation) return;

      setStats(data);

      // Sync exercise_kind only from server auto-selection (no equipment)
      if (data.appliedFilters) {
        const applied = data.appliedFilters;
        if (applied.exercise_kinds?.length > 0) {
          setFilters((prev) => {
            if (prev.exercise_kinds?.length) return prev;
            return { ...prev, exercise_kinds: applied.exercise_kinds };
          });
        }
      }
    } catch (err) {
      if (fetchGenerationRef.current !== generation) return;
      console.error('Error fetching filtered exercise stats:', err);
      setError(err as Error);
      setStats(null);
    } finally {
      if (fetchGenerationRef.current === generation) setLoading(false);
    }
  }, [session?.user.id, filters, prefs.weightUnit, prefs.distanceUnit]);

  // Fetch relationships once on mount
  const fetchRelationships = useCallback(async () => {
    if (!session?.user.id) return;

    try {
      const data = await getFilterRelationships();
      setRelationships(data);

      // Compute initial options from relationships
      const options = computeCascadedOptions(data);
      setFilterOptions({
        exercise_kinds: options.exercise_kinds,
        modifiers: options.modifiers,
        equipment: options.equipment,
      });
    } catch (err) {
      console.error('Error fetching filter relationships:', err);
    }
  }, [session?.user.id]);

  fetchStatsRef.current = fetchStats;

  const userId = session?.user.id;

  // Fetch relationships once on mount
  useEffect(() => {
    if (userId) {
      fetchRelationships();
    }
  }, [userId, fetchRelationships]);

  // Compute cascaded options when filters change (no API call)
  useEffect(() => {
    if (relationships.length === 0) return;

    const options = computeCascadedOptions(
      relationships,
      filters.exercise_kinds,
      filters.equipment,
      filters.modifiers
    );
    setFilterOptions({
      exercise_kinds: options.exercise_kinds,
      modifiers: options.modifiers,
      equipment: options.equipment,
    });
  }, [relationships, filters.exercise_kinds, filters.equipment, filters.modifiers]);

  useEffect(() => {
    if (userId) {
      fetchStats();
    } else {
      setStats(null);
      setLoading(false);
    }
  }, [userId, fetchStats]);

  const stableRefetch = useCallback(() => {
    return fetchStatsRef.current?.() ?? Promise.resolve();
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      exercise_kinds: prev.exercise_kinds,
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

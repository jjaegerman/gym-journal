import { useEffect, useState, useCallback } from 'react';
import {
  getExerciseStats,
  type ExerciseStats,
} from '@/lib/api/supabase/stats';
import { useSession } from './useSession';

/**
 * Custom hook to fetch and manage exercise statistics
 * Separated from profile stats for the dedicated Stats tab
 */
export function useExerciseStats() {
  const { user } = useSession();
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getExerciseStats();
      setExerciseStats(data);
    } catch (err) {
      console.error('Error fetching exercise stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch exercise stats'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    exerciseStats,
    loading,
    error,
    refetch: fetchStats,
  };
}

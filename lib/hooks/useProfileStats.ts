import { useEffect, useState, useCallback } from 'react';
import {
  getUserProfileStats,
  getExerciseStats,
  type ProfileStats,
  type ExerciseStats,
} from '@/lib/api/supabase/stats';
import { useSession } from './useSession';

/**
 * Custom hook to fetch and manage user profile statistics
 * Includes caching and refresh capabilities
 */
export function useProfileStats(daysBack: number = 90) {
  const { user } = useSession();
  const [stats, setStats] = useState<ProfileStats | null>(null);
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

      const [profileData, exerciseData] = await Promise.all([
        getUserProfileStats(user.id, daysBack),
        getExerciseStats(user.id, daysBack),
      ]);

      setStats(profileData);
      setExerciseStats(exerciseData);
    } catch (err) {
      console.error('Error fetching profile stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, daysBack]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    exerciseStats,
    loading,
    error,
    refetch: fetchStats,
  };
}

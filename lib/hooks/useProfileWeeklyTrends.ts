import { useEffect, useState, useCallback } from 'react';
import {
  getProfileWeeklyTrends,
  rangeToDates,
  type ProfileRange,
  type WeeklyTrends,
} from '@/lib/api/supabase/profileTrends';
import { useSession } from './useSession';

export function useProfileWeeklyTrends(range: ProfileRange, earliest?: string | null) {
  const { user } = useSession();
  const [data, setData] = useState<WeeklyTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = rangeToDates(range, earliest);
      const result = await getProfileWeeklyTrends(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch weekly trends'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, range, earliest]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

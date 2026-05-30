import { useEffect, useState, useCallback } from 'react';
import {
  getDailyTrainingSummary,
  rangeToDates,
  type ProfileRange,
  type DailySummaryPoint,
} from '@/lib/api/supabase/profileTrends';
import { useSession } from './useSession';

export function useDailyTrainingSummary(range: ProfileRange, earliest?: string | null) {
  const { user } = useSession();
  const [data, setData] = useState<DailySummaryPoint[]>([]);
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
      const result = await getDailyTrainingSummary(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch daily summary'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, range, earliest]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

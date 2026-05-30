import { useEffect, useState, useCallback } from 'react';
import {
  getUserPrTimeline,
  type ProfileRange,
  type PrTimelineEntry,
} from '@/lib/api/supabase/profileTrends';
import { useSession } from './useSession';
import { useUnitPreferences } from './useUnitPreferences';

export function usePrTimeline(range: ProfileRange, limit: number = 8) {
  const { user } = useSession();
  const { prefs } = useUnitPreferences();
  const [data, setData] = useState<PrTimelineEntry[]>([]);
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
      const result = await getUserPrTimeline(range, limit, prefs.weightUnit, prefs.distanceUnit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch PR timeline'));
    } finally {
      setLoading(false);
    }
  }, [user?.id, range, limit, prefs.weightUnit, prefs.distanceUnit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

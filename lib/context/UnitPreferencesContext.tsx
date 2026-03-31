import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getUserUnitPreferences,
  updateUserUnitPreferences,
  UnitPreferences,
} from '@/lib/api/supabase/profile';
import { useSession } from '@/lib/hooks';

const DEFAULT_PREFS: UnitPreferences = { weightUnit: 'lbs', distanceUnit: 'miles' };

interface UnitPreferencesContextValue {
  prefs: UnitPreferences;
  updatePrefs: (next: UnitPreferences) => Promise<void>;
  loading: boolean;
}

const UnitPreferencesContext = createContext<UnitPreferencesContextValue | null>(null);

export function UnitPreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [prefs, setPrefs] = useState<UnitPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    getUserUnitPreferences()
      .then(setPrefs)
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoading(false));
  }, [session]);

  const updatePrefs = useCallback(async (next: UnitPreferences) => {
    setPrefs(next);
    await updateUserUnitPreferences(next);
  }, []);

  return (
    <UnitPreferencesContext.Provider value={{ prefs, updatePrefs, loading }}>
      {children}
    </UnitPreferencesContext.Provider>
  );
}

export function useUnitPreferences() {
  const ctx = useContext(UnitPreferencesContext);
  if (!ctx) throw new Error('useUnitPreferences must be used within UnitPreferencesProvider');
  return ctx;
}

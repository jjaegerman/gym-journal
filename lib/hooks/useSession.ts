import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '@/lib/api/supabase/auth';

/**
 * Custom hook to manage authentication session
 * Handles session state and auth state changes
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    loading,
    user: session?.user ?? null,
    isAuthenticated: !!session,
  };
}

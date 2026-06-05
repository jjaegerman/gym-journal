import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { getSession, refreshSession, onAuthStateChange, startAutoRefresh, stopAutoRefresh } from '@/lib/api/supabase/auth';
import { posthog, track } from '@/lib/analytics/track';

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        return getSession().then(({ data: { session } }) => session);
      }
      return session;
    }).then((session) => {
      setSession(session ?? null);
      setLoading(false);
      if (session?.user) {
        posthog?.identify(session.user.id, session.user.email ? { email: session.user.email } : undefined);
      }
    });

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        posthog?.identify(session.user.id, session.user.email ? { email: session.user.email } : undefined);
        const method = (session.user.app_metadata?.provider as string | undefined) ?? 'unknown';
        const createdAt = session.user.created_at ? Date.parse(session.user.created_at) : 0;
        const isNewUser = createdAt > 0 && Date.now() - createdAt < 60_000;
        track(isNewUser ? 'auth_signed_up' : 'auth_signed_in', { method });
      } else if (event === 'SIGNED_OUT') {
        posthog?.reset();
      }
    });

    startAutoRefresh();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return {
    session: ctx.session,
    loading: ctx.loading,
    user: ctx.session?.user ?? null,
    isAuthenticated: !!ctx.session,
  };
}

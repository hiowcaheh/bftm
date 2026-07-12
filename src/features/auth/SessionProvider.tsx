import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { qk } from '@/lib/queryKeys';
import { can as canBase, type Permission } from '@/lib/permissions';
import { fetchMyProfile, signOut } from './api';
import { toCurrentUser, type CurrentUser } from './types';

interface SessionContextValue {
  /** undefined = trwa odtwarzanie sesji z localStorage */
  session: Session | null | undefined;
  user: CurrentUser | null;
  /** true dopóki nie wiemy, czy użytkownik jest zalogowany i kim jest */
  loading: boolean;
  can: (permission: Permission) => boolean;
  /** Wymuś ponowne pobranie profilu (np. po zmianie nazwy/avatara). */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: undefined,
  user: null,
  loading: true,
  can: () => false,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const queryClient = useQueryClient();

  const hadSessionRef = useRef(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      hadSessionRef.current = !!data.session;
      setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Prawdziwe logowanie (nie odtworzenie sesji z localStorage) → dziennik
      if (event === 'SIGNED_IN' && next && !hadSessionRef.current) {
        supabase
          .from('activity_log')
          .insert({ actor: next.user.id, action: 'login', entity: 'auth' })
          .then(({ error }) => {
            if (error) console.error('Nie zapisano logowania w dzienniku:', error);
          });
      }
      hadSessionRef.current = !!next;
      setSession(next);
      if (!next) {
        // wylogowanie: czyścimy cały cache, żeby dane nie przeciekły między kontami
        queryClient.clear();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id;
  const profileQuery = useQuery({
    queryKey: qk.profile.me(),
    queryFn: () => fetchMyProfile(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const profile = profileQuery.data ?? null;
  const user = profile ? toCurrentUser(profile) : null;

  // Konto dezaktywowane → natychmiastowe wylogowanie
  useEffect(() => {
    if (profile && !profile.active) {
      void signOut();
    }
  }, [profile]);

  // Obecność: odświeżaj „ostatnio online" co minutę i po powrocie do apki
  useEffect(() => {
    if (!userId) return;
    const ping = () => {
      void supabase.rpc('touch_last_seen');
    };
    ping();
    const interval = setInterval(ping, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  const loading =
    session === undefined || (!!session && profileQuery.isLoading);

  return (
    <SessionContext.Provider
      value={{
        session,
        user,
        loading,
        can: (permission) => canBase(user, permission),
        refresh: async () => {
          await queryClient.invalidateQueries({ queryKey: qk.profile.me() });
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  return useContext(SessionContext);
}

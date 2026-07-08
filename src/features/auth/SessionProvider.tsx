import {
  createContext,
  useContext,
  useEffect,
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
}

const SessionContext = createContext<SessionContextValue>({
  session: undefined,
  user: null,
  loading: true,
  can: () => false,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
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

  const loading =
    session === undefined || (!!session && profileQuery.isLoading);

  return (
    <SessionContext.Provider
      value={{
        session,
        user,
        loading,
        can: (permission) => canBase(user, permission),
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

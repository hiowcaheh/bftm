import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './AppLayout';
import { modules } from './moduleRegistry';
import { SkeletonList } from '@/components/ui/Skeleton';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('@/features/auth/pages/ChangePasswordPage'));
const MorePage = lazy(() => import('./MorePage'));

function FullScreenLoader() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-16">
      <SkeletonList rows={5} />
    </div>
  );
}

/**
 * Guard tras: niezalogowany → logowanie; must_change_password → wymuszona
 * zmiana hasła zamiast aplikacji (nie da się jej ominąć nawigacją).
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, user, loading } = useSession();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/logowanie" replace />;
  if (user?.mustChangePassword) return <ChangePasswordPage />;
  return children;
}

/** Zalogowany użytkownik nie powinien widzieć ekranu logowania. */
function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;
  return children;
}

export function AppRouter() {
  return (
    <HashRouter>
      <SessionProvider>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route
              path="/logowanie"
              element={
                <RedirectIfAuthed>
                  <LoginPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              {modules.map((mod) => (
                <Route
                  key={mod.id}
                  path={mod.path === '/' ? undefined : mod.path}
                  index={mod.path === '/'}
                  element={<mod.element />}
                />
              ))}
              <Route path="/wiecej" element={<MorePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </SessionProvider>
    </HashRouter>
  );
}

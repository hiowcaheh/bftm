import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './AppLayout';
import { modules } from './moduleRegistry';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useMockAuth } from '@/features/auth/store';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const MorePage = lazy(() => import('./MorePage'));

/** Guard tras: niezalogowany → ekran logowania (Etap 2: prawdziwa sesja Supabase). */
function RequireAuth({ children }: { children: ReactNode }) {
  const loggedIn = useMockAuth((s) => s.loggedIn);
  const location = useLocation();
  if (!loggedIn) {
    return <Navigate to="/logowanie" replace state={{ from: location }} />;
  }
  return children;
}

export function AppRouter() {
  return (
    <HashRouter>
      <Suspense fallback={<SkeletonList rows={5} />}>
        <Routes>
          <Route path="/logowanie" element={<LoginPage />} />
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
    </HashRouter>
  );
}

import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppLayout } from './AppLayout';
import { canAccessModule, modules } from './moduleRegistry';
import { SkeletonList } from '@/components/ui/Skeleton';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';
import type { Permission } from '@/lib/permissions';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const ChangePasswordPage = lazy(() => import('@/features/auth/pages/ChangePasswordPage'));
const EmployeeDetailPage = lazy(
  () => import('@/features/employees/pages/EmployeeDetailPage'),
);
const ClientDetailPage = lazy(() => import('@/features/clients/pages/ClientDetailPage'));
const ProjectDetailPage = lazy(() => import('@/features/projects/pages/ProjectDetailPage'));
const MyProfilePage = lazy(() => import('@/features/profile/pages/MyProfilePage'));
const ExpensesPage = lazy(() => import('@/features/expenses/pages/ExpensesPage'));

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

/** Trasa modułu dostępna tylko z wymaganym uprawnieniem (UI ukrywa, RLS chroni). */
function RequirePerm({
  permission,
  children,
}: {
  permission: Permission | Permission[] | undefined;
  children: ReactNode;
}) {
  const { can } = useSession();
  if (!canAccessModule(can, { requiredPermission: permission })) {
    return <Navigate to="/" replace />;
  }
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
                  element={
                    <RequirePerm permission={mod.requiredPermission}>
                      <mod.element />
                    </RequirePerm>
                  }
                />
              ))}
              <Route
                path="/pracownicy/:id"
                element={
                  <RequirePerm permission="employees_view">
                    <EmployeeDetailPage />
                  </RequirePerm>
                }
              />
              <Route
                path="/klienci/:id"
                element={
                  <RequirePerm permission="clients_view">
                    <ClientDetailPage />
                  </RequirePerm>
                }
              />
              <Route
                path="/projekty/:id"
                element={
                  <RequirePerm permission="projects_view">
                    <ProjectDetailPage />
                  </RequirePerm>
                }
              />
              <Route path="/profil" element={<MyProfilePage />} />
              <Route
                path="/finanse/paragony"
                element={
                  <RequirePerm
                    permission={['expenses_add', 'expenses_view_all', 'finance_view']}
                  >
                    <ExpensesPage />
                  </RequirePerm>
                }
              />
              {/* stara ścieżka Kosztów — zakładki przemianowane na Finanse */}
              <Route path="/koszty" element={<Navigate to="/finanse" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </SessionProvider>
    </HashRouter>
  );
}

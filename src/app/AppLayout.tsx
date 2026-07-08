import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SkeletonList } from '@/components/ui/Skeleton';

/** Wspólny layout zalogowanej części aplikacji: treść + dolna nawigacja. */
export function AppLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl">
      <main
        className="px-4 pt-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)',
        }}
      >
        <Suspense fallback={<SkeletonList rows={5} />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}

import { Suspense, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MoreDrawer } from './MoreDrawer';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { bottomNavModules } from './moduleRegistry';
import { SkeletonList } from '@/components/ui/Skeleton';

/**
 * Wspólny layout zalogowanej części: treść + dolna nawigacja + menu „Więcej".
 * Poziomy swipe przełącza sąsiednie zakładki dolnego paska (iOS-first).
 */
export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || moreOpen) return;
    // Nie przechwytujemy gestów zaczynających się na poziomych listach,
    // inputach ani elementach oznaczonych data-noswipe (np. siatka dziennika)
    const target = e.target as HTMLElement;
    if (target.closest('.no-scrollbar, input, textarea, select, [data-noswipe]')) return;

    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // bardzo czuły gest: lekki ruch 28 px w bok wystarczy, byle poziom > pion
    if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;

    const index = bottomNavModules.findIndex((m) =>
      m.path === '/' ? pathname === '/' : pathname.startsWith(m.path),
    );
    if (index === -1) return;
    const next = index + (dx < 0 ? 1 : -1);
    const targetModule = bottomNavModules[next];
    if (targetModule) navigate(targetModule.path);
  };

  return (
    <div className="mx-auto min-h-dvh max-w-3xl">
      <main
        className="px-4 pt-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Suspense fallback={<SkeletonList rows={5} />}>
          <Outlet />
        </Suspense>
      </main>
      <NotificationBell />
      <BottomNav onMoreClick={() => setMoreOpen(true)} moreOpen={moreOpen} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

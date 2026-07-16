import { Suspense, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MoreDrawer } from './MoreDrawer';
import { bottomNavModules, modules } from './moduleRegistry';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonList } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { usePublicBranding } from '@/features/auth/hooks';
import { logoPublicUrl } from '@/features/settings/api';

export type NavDirection = 'forward' | 'back' | null;

/** Tytuł w górnym pasku wyprowadzony z rejestru modułów. */
function pageTitle(pathname: string): string {
  if (pathname === '/') return 'Pulpit';
  if (pathname === '/profil') return 'Mój profil';
  if (pathname === '/finanse/paragony') return 'Paragony';
  const module = modules.find((m) => m.path !== '/' && pathname.startsWith(m.path));
  return module?.label ?? 'BFTM';
}

/**
 * Layout zalogowanej części: stały górny pasek (tytuł + dzwoneczek),
 * treść z animowanym przejściem, dolna nawigacja, menu „Więcej".
 * Poziomy swipe (lekki gest) przełącza sąsiednie zakładki — iOS-first.
 */
export function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const directionRef = useRef<NavDirection>(null);

  const setDirection = (direction: NavDirection) => {
    directionRef.current = direction;
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || moreOpen) return;
    // Nie przechwytujemy gestów z poziomych list, inputów ani stref data-noswipe
    const target = e.target as HTMLElement;
    if (target.closest('.no-scrollbar, input, textarea, select, [data-noswipe]')) return;

    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // lekki gest: 24 px w bok wystarczy, byle poziom przeważał nad pionem
    if (Math.abs(dx) < 24 || Math.abs(dx) < Math.abs(dy)) return;

    const index = bottomNavModules.findIndex((m) =>
      m.path === '/' ? pathname === '/' : pathname.startsWith(m.path),
    );
    if (index === -1) return;
    const next = index + (dx < 0 ? 1 : -1);
    const targetModule = bottomNavModules[next];
    if (targetModule) {
      setDirection(dx < 0 ? 'forward' : 'back');
      navigate(targetModule.path);
    }
  };

  const direction = directionRef.current;

  const branding = usePublicBranding();
  const logoUrl = branding.data?.logoPath ? logoPublicUrl(branding.data.logoPath) : null;

  return (
    <div
      className="mx-auto flex min-h-dvh max-w-3xl flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Firmowe logo w tle — subtelna nakładka przy górze (nad treścią, pod
          paskiem i menu; klik przechodzi), widoczna na każdej stronie. */}
      {logoUrl && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[5] flex justify-center overflow-hidden"
        >
          <img
            src={logoUrl}
            alt=""
            className="w-80 max-w-[82%] object-contain opacity-[0.06]"
            style={{ marginTop: 'calc(env(safe-area-inset-top) + 5.25rem)' }}
          />
        </div>
      )}
      {/* Stały górny pasek — tytuł zakładki + powiadomienia, widoczny wszędzie */}
      <header
        className="fixed inset-x-0 top-0 z-30 border-b border-line bg-bg/90 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="relative mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <h1 className="max-w-[42%] truncate text-lg font-semibold">{pageTitle(pathname)}</h1>
          {/* Subtelny firmowy znak na środku paska */}
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[17px] font-extrabold tracking-[0.14em] text-accent">
            BFTM
          </span>
          <NotificationBell />
        </div>
      </header>

      <OfflineBanner />

      <main
        className="flex-1 px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 3.75rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)',
        }}
      >
        <Suspense fallback={<SkeletonList rows={5} />}>
          {/* key = pathname → animowane wejście strony przy każdej zmianie */}
          <div
            key={pathname}
            className={cn(
              direction === 'forward' && 'animate-page-forward',
              direction === 'back' && 'animate-page-back',
              !direction && 'animate-fade-in',
            )}
          >
            <Outlet />
          </div>
        </Suspense>
      </main>

      <BottomNav
        onMoreClick={() => setMoreOpen(true)}
        moreOpen={moreOpen}
        onNavigateDirection={setDirection}
      />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

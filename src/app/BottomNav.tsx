import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { bottomNavModules, canAccessModule, moreModules } from './moduleRegistry';
import { useSession } from '@/features/auth/SessionProvider';

import type { NavDirection } from './AppLayout';

interface BottomNavProps {
  onMoreClick: () => void;
  moreOpen: boolean;
  /** kierunek animacji przejścia (tap w zakładkę dalej/wcześniej) */
  onNavigateDirection?: (direction: NavDirection) => void;
}

/** Dolny pasek: moduły z rejestru przefiltrowane uprawnieniami + „Więcej". */
export function BottomNav({ onMoreClick, moreOpen, onNavigateDirection }: BottomNavProps) {
  const { pathname } = useLocation();
  const { can } = useSession();
  const t = useT();
  const visible = bottomNavModules.filter((m) => canAccessModule(can, m));
  const moreActive = moreOpen || moreModules.some((m) => pathname.startsWith(m.path));
  const currentIndex = visible.findIndex((m) =>
    m.path === '/' ? pathname === '/' : pathname.startsWith(m.path),
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-[3.25rem] max-w-3xl items-stretch">
        {visible.map((mod, index) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            end={mod.path === '/'}
            onClick={() =>
              onNavigateDirection?.(
                currentIndex === -1 || index === currentIndex
                  ? null
                  : index > currentIndex
                    ? 'forward'
                    : 'back',
              )
            }
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
                isActive ? 'text-accent' : 'text-text-secondary',
              )
            }
          >
            <mod.icon className="size-6" strokeWidth={1.8} />
            {t(`nav.${mod.id}`)}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMoreClick}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
            moreActive ? 'text-accent' : 'text-text-secondary',
          )}
        >
          <MoreHorizontal className="size-6" strokeWidth={1.8} />
          {t('nav.more')}
        </button>
      </div>
    </nav>
  );
}

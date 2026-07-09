import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { bottomNavModules, moreModules } from './moduleRegistry';

interface BottomNavProps {
  onMoreClick: () => void;
  moreOpen: boolean;
}

/**
 * Dolny pasek: 4 moduły z rejestru + „Więcej" (otwiera slide-in menu).
 * W Etapie 3 lista zostanie przefiltrowana przez uprawnienia użytkownika.
 */
export function BottomNav({ onMoreClick, moreOpen }: BottomNavProps) {
  const { pathname } = useLocation();
  const moreActive = moreOpen || moreModules.some((m) => pathname.startsWith(m.path));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-[3.25rem] max-w-3xl items-stretch">
        {bottomNavModules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            end={mod.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
                isActive ? 'text-accent' : 'text-text-secondary',
              )
            }
          >
            <mod.icon className="size-6" strokeWidth={1.8} />
            {mod.label}
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
          Więcej
        </button>
      </div>
    </nav>
  );
}

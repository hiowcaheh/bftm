import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { bottomNavModules, moreModules } from './moduleRegistry';

/**
 * Dolny pasek: 4 moduły z rejestru + „Więcej".
 * W Etapie 3 lista zostanie przefiltrowana przez uprawnienia użytkownika.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const moreActive = moreModules.some((m) => pathname.startsWith(m.path));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-16 max-w-3xl items-stretch">
        {bottomNavModules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            end={mod.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                isActive ? 'text-accent' : 'text-text-secondary',
              )
            }
          >
            <mod.icon className="size-6" strokeWidth={1.8} />
            {mod.label}
          </NavLink>
        ))}
        <NavLink
          to="/wiecej"
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
            moreActive || pathname === '/wiecej' ? 'text-accent' : 'text-text-secondary',
          )}
        >
          <MoreHorizontal className="size-6" strokeWidth={1.8} />
          Więcej
        </NavLink>
      </div>
    </nav>
  );
}

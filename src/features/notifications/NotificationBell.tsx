import { useState } from 'react';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/lib/cn';
import { useMarkAllRead, useNotifications } from './hooks';

/**
 * Dzwoneczek w prawym górnym rogu: czerwona kropka z liczbą nieodczytanych,
 * tap otwiera panel powiadomień; otwarcie oznacza wszystkie jako przeczytane.
 */
export function NotificationBell() {
  const notifications = useNotifications();
  const markAllRead = useMarkAllRead();
  const [open, setOpen] = useState(false);

  const list = notifications.data ?? [];
  const unread = list.filter((n) => !n.read_at).length;

  const openPanel = () => {
    setOpen(true);
    if (unread > 0) markAllRead.mutate();
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Powiadomienia${unread ? ` (${unread} nieprzeczytanych)` : ''}`}
        onClick={openPanel}
        className="press fixed right-4 z-40 flex size-11 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
        style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <Bell className="size-5 text-text" strokeWidth={1.8} />
        {unread > 0 && (
          <span className="tabular-nums absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Powiadomienia">
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-(--shadow-card)">
              <BellOff className="size-6 text-text-secondary/60" />
            </div>
            <p className="text-sm text-text-secondary">Nie masz jeszcze żadnych powiadomień.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs text-text-secondary">
              <CheckCheck className="size-4" /> Wszystkie oznaczone jako przeczytane
            </p>
            {list.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'rounded-xl bg-white p-3 shadow-(--shadow-card)',
                  !n.read_at && 'ring-1 ring-accent/30',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {!n.read_at && <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />}
                </div>
                {n.body && <p className="mt-0.5 text-xs text-text-secondary">{n.body}</p>}
                <p className="mt-1 text-[11px] text-text-secondary/70">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: pl })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}

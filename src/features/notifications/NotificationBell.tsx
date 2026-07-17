import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CalendarOff,
  CheckCheck,
  CircleCheck,
  FileText,
  Info,
  ListChecks,
  Megaphone,
  ReceiptText,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useI18n } from '@/lib/i18n/context';
import { syncAppBadge } from '@/lib/badge';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/lib/cn';
import { useMarkAllRead, useNotifications } from './hooks';

/** Ikona i kolor wg typu powiadomienia — kolejne typy dopisujemy tutaj. */
const TYPE_STYLES: Record<
  string,
  { icon: ComponentType<LucideProps>; className: string }
> = {
  hours_approved: { icon: CircleCheck, className: 'bg-success-soft text-success' },
  offer_response: { icon: FileText, className: 'bg-info-soft text-info' },
  payslip: { icon: ReceiptText, className: 'bg-accent-soft text-accent' },
  absence: { icon: CalendarOff, className: 'bg-warning-soft text-warning' },
  announcement: { icon: Megaphone, className: 'bg-accent-soft text-accent' },
  checklist: { icon: ListChecks, className: 'bg-accent-soft text-accent' },
  info: { icon: Info, className: 'bg-info-soft text-info' },
};

/**
 * Dzwoneczek w prawym górnym rogu: czerwona kropka z liczbą nieodczytanych,
 * tap otwiera panel powiadomień; otwarcie oznacza wszystkie jako przeczytane.
 */
/** Dokąd prowadzi tapnięcie w powiadomienie danego typu. */
const TYPE_ROUTES: Record<string, string> = {
  payslip: '/wyplaty',
  hours_approved: '/godziny',
  offer_response: '/oferty',
  checklist: '/',
};

export function NotificationBell() {
  const { t, dateLocale } = useI18n();
  const notifications = useNotifications();
  const markAllRead = useMarkAllRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const list = notifications.data ?? [];
  const unread = list.filter((n) => !n.read_at).length;

  // kółeczko z liczbą na ikonce aplikacji podąża za liczbą nieprzeczytanych
  useEffect(() => {
    if (notifications.data) syncAppBadge(unread);
  }, [notifications.data, unread]);

  const openPanel = () => {
    setOpen(true);
    if (unread > 0) markAllRead.mutate();
  };

  return (
    <>
      <button
        type="button"
        aria-label={unread ? t('notif.ariaUnread', { n: unread }) : t('notif.aria')}
        onClick={openPanel}
        className="press relative flex size-9 items-center justify-center rounded-full bg-white shadow-(--shadow-card)"
      >
        <Bell className="size-[1.05rem] text-text" strokeWidth={1.8} />
        {unread > 0 && (
          <span className="tabular-nums absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title={t('notif.title')}>
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-(--shadow-card)">
              <BellOff className="size-6 text-text-secondary/60" />
            </div>
            <p className="text-sm text-text-secondary">{t('notif.empty')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs text-text-secondary">
              <CheckCheck className="size-4" /> {t('notif.allRead')}
            </p>
            {list.map((n) => {
              const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.info!;
              const Icon = style.icon;
              const route = TYPE_ROUTES[n.type];
              return (
                <button
                  key={n.id}
                  type="button"
                  disabled={!route}
                  className={cn(
                    'press flex gap-3 rounded-xl bg-white p-3 text-left shadow-(--shadow-card)',
                    !n.read_at && 'ring-1 ring-accent/30',
                    !route && 'cursor-default',
                  )}
                  onClick={() => {
                    if (route) {
                      setOpen(false);
                      navigate(route);
                    }
                  }}
                >
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      style.className,
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read_at && (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-accent" />
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-text-secondary first-line:font-semibold first-line:text-text">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-text-secondary/70">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Drawer>
    </>
  );
}

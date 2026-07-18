import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { getExistingSubscription, isPushSupported, subscribePush } from '@/lib/push';
import { useSession } from '@/features/auth/SessionProvider';

/** Raz odrzucone — nie męczymy więcej; push można włączyć w Ustawieniach. */
const DISMISSED_KEY = 'bftm-push-prompt-dismissed';

/**
 * Jednorazowa zachęta do włączenia powiadomień push, pokazywana chwilę po
 * zalogowaniu, gdy urządzenie wspiera push i nie ma jeszcze subskrypcji.
 */
export function PushOptIn() {
  const t = useT();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (Notification.permission === 'denied') return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void getExistingSubscription().then((sub) => {
        if (!cancelled && sub === null) setOpen(true);
      });
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user]);

  if (!open || !user) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await subscribePush(user.id);
      toast.success(t('settings.pushOn'));
      localStorage.setItem(DISMISSED_KEY, '1');
      setOpen(false);
    } catch (e) {
      toast.error(
        (e as Error).message === 'permission-denied'
          ? t('settings.pushDenied')
          : t('settings.pushErr'),
      );
      dismiss();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-4 pb-8 sm:items-center">
      <button
        aria-label={t('notif.pushAskLater')}
        className="animate-fade-in absolute inset-0 bg-black/40"
        onClick={dismiss}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('notif.pushAskTitle')}
        className="animate-toast-in relative w-full max-w-sm rounded-(--radius-card) bg-white p-6 text-center shadow-(--shadow-card)"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft">
          <BellRing className="size-8 text-accent" strokeWidth={1.8} />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{t('notif.pushAskTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {t('notif.pushAskDesc')}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button fullWidth loading={busy} onClick={() => void enable()}>
            {t('notif.pushAskOn')}
          </Button>
          <Button variant="secondary" fullWidth onClick={dismiss}>
            {t('notif.pushAskLater')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

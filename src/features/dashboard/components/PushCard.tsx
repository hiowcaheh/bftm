import { useEffect, useState } from 'react';
import { BellOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { getExistingSubscription, isPushSupported, subscribePush } from '@/lib/push';
import { useSession } from '@/features/auth/SessionProvider';

type PushState = 'checking' | 'ok' | 'off' | 'install' | 'denied' | 'hidden';

/** iPhone/iPad (także iPad udający Maca) — tam push działa tylko z ikony na ekranie. */
const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

function detect(): Promise<PushState> | PushState {
  if (!isPushSupported()) return isIos() && !isStandalone() ? 'install' : 'hidden';
  if (Notification.permission === 'denied') return 'denied';
  return getExistingSubscription().then((sub) => (sub ? 'ok' : 'off'));
}

/**
 * Stały kafelek na Pulpicie dla osób bez powiadomień push — bez „Może później":
 * znika dopiero po włączeniu. Zastąpił jednorazowe okienko (PushOptIn), które
 * po zamknięciu nie wracało i część zespołu nie dostawała przypomnień.
 */
export function PushCard() {
  const t = useT();
  const { user } = useSession();
  const [state, setState] = useState<PushState>('checking');
  const [busy, setBusy] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(detect()).then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user || state === 'checking' || state === 'ok' || state === 'hidden') return null;

  const enable = async () => {
    setBusy(true);
    try {
      await subscribePush(user.id);
      toast.success(t('settings.pushOn'));
      setState('ok');
    } catch (e) {
      if ((e as Error).message === 'permission-denied') {
        setState(Notification.permission === 'denied' ? 'denied' : 'off');
        toast.error(t('settings.pushDenied'));
      } else {
        toast.error(t('settings.pushErr'));
      }
    } finally {
      setBusy(false);
    }
  };

  const denied = state === 'denied';
  const Icon = state === 'install' ? Smartphone : BellOff;
  const title =
    state === 'install' ? t('notif.installTitle') : denied ? t('notif.deniedTitle') : t('notif.cardTitle');
  const sub =
    state === 'install' ? t('notif.installSub') : denied ? t('notif.deniedSub') : t('notif.cardSub');

  return (
    <>
      <Card
        className={cn(
          'flex items-center gap-3 border-l-4 p-4',
          denied ? 'border-warning' : 'border-info',
        )}
      >
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            denied ? 'bg-warning-soft' : 'bg-info-soft',
          )}
        >
          <Icon className={cn('size-6', denied ? 'text-warning' : 'text-info')} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-text-secondary">{sub}</p>
        </div>
        {state === 'off' && (
          <Button size="sm" loading={busy} onClick={() => void enable()}>
            {t('notif.cardBtn')}
          </Button>
        )}
        {state === 'install' && (
          <Button size="sm" onClick={() => setHowToOpen(true)}>
            {t('notif.installBtn')}
          </Button>
        )}
      </Card>

      <Sheet open={howToOpen} onClose={() => setHowToOpen(false)} title={t('notif.installTitle')}>
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-text-secondary">{t('notif.installIntro')}</p>
          <ol className="flex flex-col gap-3">
            {[t('notif.installStep1'), t('notif.installStep2'), t('notif.installStep3')].map(
              (step, i) => (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-bold text-accent">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ),
            )}
          </ol>
        </div>
      </Sheet>
    </>
  );
}

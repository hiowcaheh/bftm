import { useEffect, useState } from 'react';
import { BellRing, Check, Info, Languages, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { checkForSwUpdate, installSwUpdate } from '@/lib/swUpdate';
import {
  getExistingSubscription,
  isPushSupported,
  subscribePush,
  unsubscribePush,
} from '@/lib/push';
import { useI18n } from '@/lib/i18n/context';
import { LANGS } from '@/lib/i18n/types';
import { useSession } from '@/features/auth/SessionProvider';
import { saveMyLanguage } from '../api';
import { CompanySection } from '../components/CompanySection';
import { FinanceSection } from '../components/FinanceSection';
import { AccountSection } from '../components/AccountSection';

const APP_VERSION = '0.34.0'; // aktualizowane przy każdym etapie, patrz CHANGELOG.md

/**
 * Ustawienia: Język, Firma (tylko admin), Moje konto, Aplikacja.
 */
export default function SettingsPage() {
  const { user } = useSession();
  const { lang, setLang, t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (!pushSupported) return;
    void getExistingSubscription().then((sub) => setPushOn(sub !== null));
  }, [pushSupported]);

  const togglePush = async (on: boolean) => {
    if (!user || pushBusy) return;
    setPushBusy(true);
    try {
      if (on) {
        await subscribePush(user.id);
        setPushOn(true);
        toast.success(t('settings.pushOn'));
      } else {
        await unsubscribePush();
        setPushOn(false);
        toast.info(t('settings.pushOff'));
      }
    } catch (e) {
      toast.error(
        (e as Error).message === 'permission-denied'
          ? t('settings.pushDenied')
          : t('settings.pushErr'),
      );
    } finally {
      setPushBusy(false);
    }
  };

  const checkForUpdate = async () => {
    setChecking(true);
    const result = await checkForSwUpdate();
    setChecking(false);
    if (result === null) {
      toast.info(t('settings.swInactive'));
    } else if (result) {
      setUpdateAvailable(true);
    } else {
      toast.success(t('settings.upToDate', { v: APP_VERSION }));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ListGroup>
        <ListRow
          leading={
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
              <Languages className="size-5 text-text-secondary" strokeWidth={1.8} />
            </div>
          }
          title={t('settings.language')}
        />
        {LANGS.map((l) => (
          <ListRow
            key={l.code}
            leading={<span className="text-2xl leading-none">{l.flag}</span>}
            title={l.label}
            trailing={lang === l.code ? <Check className="size-5 text-accent" /> : undefined}
            onClick={() => {
              setLang(l.code);
              // język w profilu → powiadomienia przychodzą w języku odbiorcy
              void saveMyLanguage(l.code);
            }}
          />
        ))}
      </ListGroup>

      {pushSupported && (
        <ListGroup>
          <ListRow
            leading={
              <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
                <BellRing className="size-5 text-text-secondary" strokeWidth={1.8} />
              </div>
            }
            title={t('settings.push')}
            subtitle={t('settings.pushSub')}
            trailing={
              <Switch
                checked={pushOn}
                onChange={(v) => void togglePush(v)}
                label={t('settings.push')}
                hideLabel
              />
            }
          />
        </ListGroup>
      )}

      {user?.role === 'admin' && <CompanySection />}
      {user?.role === 'admin' && <FinanceSection />}
      <AccountSection />

      <ListGroup>
        <ListRow
          leading={
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
              <Info className="size-5 text-text-secondary" strokeWidth={1.8} />
            </div>
          }
          title={t('settings.appVersion')}
          trailing={APP_VERSION}
        />
        <ListRow
          leading={
            <div className="flex size-10 items-center justify-center rounded-xl bg-surface">
              <RefreshCw
                className={`size-5 text-text-secondary ${checking ? 'animate-spin' : ''}`}
                strokeWidth={1.8}
              />
            </div>
          }
          title={checking ? t('settings.checking') : t('settings.checkUpdate')}
          chevron
          onClick={() => !checking && void checkForUpdate()}
        />
      </ListGroup>

      <ConfirmDialog
        open={updateAvailable}
        title={t('settings.updateTitle')}
        description={t('settings.updateDesc')}
        confirmLabel={t('settings.updateConfirm')}
        cancelLabel={t('common.later')}
        loading={installing}
        onConfirm={() => {
          setInstalling(true);
          void installSwUpdate();
        }}
        onCancel={() => setUpdateAvailable(false)}
      />
    </div>
  );
}

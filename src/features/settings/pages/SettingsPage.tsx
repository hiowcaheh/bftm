import { useState } from 'react';
import { Check, Info, Languages, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { toast } from '@/components/ui/Toast';
import { checkForSwUpdate, installSwUpdate } from '@/lib/swUpdate';
import { useI18n } from '@/lib/i18n/context';
import { LANGS } from '@/lib/i18n/types';
import { useSession } from '@/features/auth/SessionProvider';
import { CompanySection } from '../components/CompanySection';
import { FinanceSection } from '../components/FinanceSection';
import { AccountSection } from '../components/AccountSection';

const APP_VERSION = '0.30.0'; // aktualizowane przy każdym etapie, patrz CHANGELOG.md

/**
 * Ustawienia: Język, Firma (tylko admin), Moje konto, Aplikacja.
 */
export default function SettingsPage() {
  const { user } = useSession();
  const { lang, setLang, t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);

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
            onClick={() => setLang(l.code)}
          />
        ))}
      </ListGroup>

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

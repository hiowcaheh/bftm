import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { toast } from '@/components/ui/Toast';
import { checkForSwUpdate, installSwUpdate } from '@/lib/swUpdate';
import { useSession } from '@/features/auth/SessionProvider';
import { CompanySection } from '../components/CompanySection';
import { FinanceSection } from '../components/FinanceSection';
import { AccountSection } from '../components/AccountSection';

const APP_VERSION = '0.12.0'; // aktualizowane przy każdym etapie, patrz CHANGELOG.md

/**
 * Ustawienia: Firma (tylko admin), Moje konto, Aplikacja.
 * Sekcje Finanse / Oferty / Moduły dojdą w kolejnych etapach.
 */
export default function SettingsPage() {
  const { user } = useSession();
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);

  const checkForUpdate = async () => {
    setChecking(true);
    const result = await checkForSwUpdate();
    setChecking(false);
    if (result === null) {
      toast.info('Service worker nie jest aktywny (tryb deweloperski)');
    } else if (result) {
      setUpdateAvailable(true);
    } else {
      toast.success(`Masz najnowszą wersję (${APP_VERSION})`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
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
          title="Wersja aplikacji"
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
          title={checking ? 'Sprawdzanie…' : 'Sprawdź aktualizację'}
          chevron
          onClick={() => !checking && void checkForUpdate()}
        />
      </ListGroup>

      <ConfirmDialog
        open={updateAvailable}
        title="Dostępna nowa wersja"
        description="Jest nowsza wersja aplikacji. Zainstalować teraz? Aplikacja odświeży się automatycznie — niezapisane zmiany w otwartych formularzach przepadną."
        confirmLabel="Zainstaluj i odśwież"
        cancelLabel="Później"
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

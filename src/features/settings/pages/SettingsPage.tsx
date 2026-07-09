import { Info, RefreshCw } from 'lucide-react';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/SessionProvider';
import { CompanySection } from '../components/CompanySection';
import { AccountSection } from '../components/AccountSection';

const APP_VERSION = '0.2.1'; // aktualizowane przy każdym etapie, patrz CHANGELOG.md

/**
 * Ustawienia: Firma (tylko admin), Moje konto, Aplikacja.
 * Sekcje Finanse / Oferty / Moduły dojdą w kolejnych etapach.
 */
export default function SettingsPage() {
  const { user } = useSession();

  const checkForUpdate = async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.update();
      toast.info('Sprawdzono — jeśli jest nowa wersja, pojawi się propozycja odświeżenia');
    } else {
      toast.info('Service worker nie jest aktywny (tryb deweloperski)');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Ustawienia</h1>

      {user?.role === 'admin' && <CompanySection />}
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
              <RefreshCw className="size-5 text-text-secondary" strokeWidth={1.8} />
            </div>
          }
          title="Sprawdź aktualizację"
          chevron
          onClick={() => void checkForUpdate()}
        />
      </ListGroup>
    </div>
  );
}

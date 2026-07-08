import { Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ListGroup, ListRow } from '@/components/ui/ListRow';

const APP_VERSION = '0.1.0'; // aktualizowane przy każdym etapie, patrz CHANGELOG.md

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Ustawienia</h1>
      <Card className="p-4 text-sm text-text-secondary">
        Sekcje Firma, Finanse, Oferty, Moduły i Moje konto pojawią się w Etapie 2 wraz z
        Supabase. Poniżej informacje o aplikacji.
      </Card>
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
      </ListGroup>
    </div>
  );
}

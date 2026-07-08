import { Receipt } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ExpensesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Koszty</h1>
      <EmptyState
        icon={Receipt}
        message="Moduł kosztów powstanie w Etapie 6 — kategorie, projekty i zdjęcia paragonów."
      />
    </div>
  );
}

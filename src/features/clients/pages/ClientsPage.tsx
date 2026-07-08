import { Contact } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Klienci</h1>
      <EmptyState
        icon={Contact}
        message="Moduł klientów powstanie w Etapie 4 — baza firm i klientów prywatnych z flagami VAT i ROT."
      />
    </div>
  );
}

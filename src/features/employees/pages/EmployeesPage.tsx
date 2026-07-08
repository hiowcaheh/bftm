import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pracownicy</h1>
      <EmptyState
        icon={Users}
        message="Moduł pracowników powstanie w Etapie 3 — konta, uprawnienia, stawki i statystyki."
      />
    </div>
  );
}

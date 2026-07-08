import { Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function TimesheetPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Godziny</h1>
      <EmptyState
        icon={Clock}
        message="Dziennik godzin powstanie w Etapie 5 — szybkie dodawanie, siatka tygodnia i nieobecności."
      />
    </div>
  );
}

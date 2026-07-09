import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <EmptyState
        icon={BarChart3}
        message="Raporty i rozliczenia powstaną w Etapie 8 — raporty godzin pod faktury, rentowność i PDF."
      />
    </div>
  );
}

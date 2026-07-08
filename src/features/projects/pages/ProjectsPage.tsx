import { HardHat } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Projekty</h1>
      <EmptyState
        icon={HardHat}
        message="Moduł projektów powstanie w Etapie 4 — lista, statusy, szczegóły z zakładkami i postęp godzin."
      />
    </div>
  );
}

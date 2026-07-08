import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function OffersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Oferty</h1>
      <EmptyState
        icon={FileText}
        message="Moduł ofert powstanie w Etapie 7 — kosztorysy z ROT i omvänd byggmoms oraz PDF."
      />
    </div>
  );
}

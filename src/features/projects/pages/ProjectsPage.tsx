import { useMemo, useState } from 'react';
import { House, Plus, Wallet, FileText, CheckCircle2 } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chips } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SearchBar } from '@/components/ui/SearchBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useSession } from '@/features/auth/SessionProvider';
import type { ProjectStatus } from '@/types/database';
import { useProjects, useProjectStats } from '../hooks';
import { PROJECT_STATUS_LABELS } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectFormSheet } from '../components/ProjectFormSheet';

const STATUS_ORDER: ProjectStatus[] = ['active', 'offer', 'paused', 'completed', 'cancelled'];

/** Zwięzła kwota po szwedzku: 480 000 → „480 tkr", 1 200 000 → „1,2 mkr". */
function compactSek(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mkr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} tkr`;
  return `${Math.round(n)} kr`;
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: ComponentType<LucideProps>;
  value: string;
  label: string;
}) {
  return (
    <Card className="relative min-h-[74px] overflow-hidden p-3">
      <Icon
        aria-hidden
        className="pointer-events-none absolute -right-2 top-1/2 size-16 -translate-y-1/2 text-accent/10"
        strokeWidth={1.5}
      />
      <div className="relative flex flex-col gap-0.5">
        <span className="tabular-nums text-xl font-semibold leading-tight">{value}</span>
        <span className="text-[11px] text-text-secondary">{label}</span>
      </div>
    </Card>
  );
}

export default function ProjectsPage() {
  const projects = useProjects();
  const stats = useProjectStats();
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const canEdit = can('projects_edit');

  const counts = useMemo(() => {
    const map = new Map<ProjectStatus, number>();
    for (const p of projects.data ?? []) {
      map.set(p.status, (map.get(p.status) ?? 0) + 1);
    }
    return map;
  }, [projects.data]);

  const activeValue = useMemo(
    () =>
      (projects.data ?? [])
        .filter((p) => p.status === 'active')
        .reduce((s, p) => s + (p.fixed_value ?? 0), 0),
    [projects.data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (projects.data ?? []).filter((p) => {
      if (status && p.status !== status) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.client?.name ?? '').toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q)
      );
    });
    // Domyślnie: najpierw aktywne, potem oferty, wstrzymane, zakończone, anulowane;
    // w obrębie statusu — najnowsze na górze (dane przychodzą już posortowane po dacie).
    return [...list].sort(
      (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );
  }, [projects.data, search, status]);

  const canFinance = can('finance_view');

  return (
    <div className="flex flex-col gap-4">
      {(projects.data?.length ?? 0) > 0 && (
        <section className="grid grid-cols-3 gap-2.5" aria-label="Podsumowanie">
          <StatTile icon={House} value={String(counts.get('active') ?? 0)} label="Aktywne" />
          {canFinance ? (
            <StatTile icon={Wallet} value={compactSek(activeValue)} label="Wartość w toku" />
          ) : (
            <StatTile icon={FileText} value={String(counts.get('offer') ?? 0)} label="Oferty" />
          )}
          <StatTile
            icon={canFinance ? FileText : CheckCircle2}
            value={String(counts.get(canFinance ? 'offer' : 'completed') ?? 0)}
            label={canFinance ? 'Oferty' : 'Zakończone'}
          />
        </section>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Szukaj projektu…" />
      <Chips
        options={STATUS_ORDER.map((s) => ({
          value: s,
          label: PROJECT_STATUS_LABELS[s],
          count: counts.get(s) ?? 0,
        }))}
        value={status}
        onChange={setStatus}
      />

      {projects.isLoading && <SkeletonList rows={4} />}

      {!projects.isLoading && filtered.length === 0 && (
        <EmptyState
          icon={House}
          message={
            search || status
              ? 'Żaden projekt nie pasuje do filtrów.'
              : 'Nie ma jeszcze projektów — dodaj pierwszy.'
          }
          action={
            canEdit && !search && !status ? (
              <Button icon={<Plus className="size-5" />} onClick={() => setFormOpen(true)}>
                Dodaj projekt
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((p) => (
          <ProjectCard key={p.id} project={p} stat={stats.data?.get(p.id) ?? null} />
        ))}
      </div>

      {canEdit && <FAB label="Dodaj projekt" onClick={() => setFormOpen(true)} />}
      <ProjectFormSheet open={formOpen} onClose={() => setFormOpen(false)} project={null} />
    </div>
  );
}

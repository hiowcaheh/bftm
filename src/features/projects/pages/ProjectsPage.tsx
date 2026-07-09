import { useMemo, useState } from 'react';
import { House, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chips } from '@/components/ui/Chips';
import { EmptyState } from '@/components/ui/EmptyState';
import { FAB } from '@/components/ui/FAB';
import { SearchBar } from '@/components/ui/SearchBar';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useSession } from '@/features/auth/SessionProvider';
import type { ProjectStatus } from '@/types/database';
import { useProjects } from '../hooks';
import { PROJECT_STATUS_LABELS } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectFormSheet } from '../components/ProjectFormSheet';

const STATUS_ORDER: ProjectStatus[] = ['active', 'offer', 'paused', 'completed', 'cancelled'];

export default function ProjectsPage() {
  const projects = useProjects();
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (projects.data ?? []).filter((p) => {
      if (status && p.status !== status) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.client?.name ?? '').toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q)
      );
    });
  }, [projects.data, search, status]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Projekty</h1>
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
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>

      {canEdit && <FAB label="Dodaj projekt" onClick={() => setFormOpen(true)} />}
      <ProjectFormSheet open={formOpen} onClose={() => setFormOpen(false)} project={null} />
    </div>
  );
}

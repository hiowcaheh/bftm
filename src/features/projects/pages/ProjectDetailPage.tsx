import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Contact,
  MapPin,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date, moneyWhole, num } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import type { ProjectStatus } from '@/types/database';
import { useDeleteProject, useProject, useUpdateProject } from '../hooks';
import {
  BILLING_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
} from '../types';
import { ProjectInvoiceSection } from '@/features/finance/components/ProjectInvoiceSection';
import { ProjectFormSheet } from '../components/ProjectFormSheet';
import { ProjectMap } from '../components/ProjectMap';
import { ProjectHoursSection } from '../components/ProjectHoursSection';
import { ProjectActivitiesSection } from '../components/ProjectActivitiesSection';
import { AdditionalWorksSection } from '../components/AdditionalWorksSection';
import { ProjectExpensesSection } from '../components/ProjectExpensesSection';
import { ProjectPhotosSection } from '../components/ProjectPhotosSection';

const STATUS_ORDER: ProjectStatus[] = ['offer', 'active', 'paused', 'completed', 'cancelled'];

export default function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { can } = useSession();
  const project = useProject(id);
  const update = useUpdateProject(id);
  const deleteProject = useDeleteProject();
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canEdit = can('projects_edit');
  const canFinance = can('finance_view');
  const isAdmin = useSession().user?.role === 'admin';

  if (project.isLoading) return <SkeletonList rows={5} />;
  if (!project.data) {
    return <p className="py-16 text-center text-sm text-text-secondary">Nie znaleziono projektu.</p>;
  }
  const p = project.data;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/projekty')}
        className="press flex items-center gap-1 self-start text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> Projekty
      </button>

      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: p.color ?? '#CC0000' }} />
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold">{p.name}</h1>
            <Badge tone={PROJECT_STATUS_TONES[p.status]}>
              {PROJECT_STATUS_LABELS[p.status]}
            </Badge>
          </div>
          {p.description && <p className="text-sm text-text-secondary">{p.description}</p>}
        </div>
      </Card>

      {p.address && <ProjectMap address={p.address} />}

      <ListGroup>
        {p.client && (
          <ListRow
            leading={<Contact className="size-5 text-text-secondary" />}
            title={p.client.name}
            subtitle="Klient"
            chevron
            onClick={() => navigate(`/klienci/${p.client?.id}`)}
          />
        )}
        {p.address && (
          <ListRow
            leading={<MapPin className="size-5 text-text-secondary" />}
            title={p.address}
            subtitle="Adres budowy"
          />
        )}
        {(p.start_date || p.end_date) && (
          <ListRow
            leading={<CalendarDays className="size-5 text-text-secondary" />}
            title={`${p.start_date ? date(p.start_date) : '…'} – ${p.end_date ? date(p.end_date) : '…'}`}
            subtitle="Termin realizacji"
          />
        )}
        {canFinance && (
          <ListRow
            leading={<Banknote className="size-5 text-text-secondary" />}
            title={[
              BILLING_TYPE_LABELS[p.billing_type],
              p.hourly_rate != null && p.billing_type !== 'fixed'
                ? `${num(p.hourly_rate)} kr/h`
                : null,
              p.fixed_value != null && p.billing_type !== 'hourly'
                ? moneyWhole(p.fixed_value)
                : null,
            ]
              .filter(Boolean)
              .join(' • ')}
            subtitle="Rozliczenie"
          />
        )}
      </ListGroup>

      {canFinance && <ProjectInvoiceSection projectId={p.id} />}

      <ProjectActivitiesSection projectId={p.id} />
      <ProjectHoursSection project={p} />
      {can('expenses_add') || can('expenses_view_all') ? (
        <ProjectExpensesSection projectId={p.id} />
      ) : null}
      <AdditionalWorksSection projectId={p.id} />
      <ProjectPhotosSection projectId={p.id} />

      {canEdit && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              icon={<Pencil className="size-5" />}
              onClick={() => setEditOpen(true)}
            >
              Edytuj
            </Button>
            <Button
              variant="secondary"
              icon={<RefreshCw className="size-5" />}
              onClick={() => setStatusOpen(true)}
            >
              Zmień status
            </Button>
          </div>
          {isAdmin && (
            <Button
              variant="destructive"
              icon={<Trash2 className="size-5" />}
              onClick={() => setConfirmDelete(true)}
            >
              Usuń projekt
            </Button>
          )}
        </div>
      )}

      <ProjectFormSheet open={editOpen} onClose={() => setEditOpen(false)} project={p} />

      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title="Zmień status">
        <div className="flex flex-col gap-2">
          {STATUS_ORDER.map((s) => (
            <Button
              key={s}
              variant={p.status === s ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => {
                if (s !== p.status) update.mutate({ status: s });
                setStatusOpen(false);
              }}
            >
              {PROJECT_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć projekt?"
        description={`„${p.name}" zostanie trwale usunięty. Jeśli ma wpisane godziny lub koszty, usunięcie zostanie zablokowane — wtedy zamiast usuwać, zmień status na Anulowany.`}
        confirmLabel="Usuń"
        destructive
        loading={deleteProject.isPending}
        onConfirm={() =>
          deleteProject.mutate(id, {
            onSuccess: () => navigate('/projekty', { replace: true }),
            onSettled: () => setConfirmDelete(false),
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

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
import { CopyButton } from '@/components/ui/CopyButton';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { date, moneyWhole, num } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { usePublicBranding } from '@/features/auth/hooks';
import { logoPublicUrl } from '@/features/settings/api';
import type { ProjectStatus } from '@/types/database';
import { useDeleteProject, useProject, useProjectStats, useUpdateProject } from '../hooks';
import { PROJECT_STATUS_TONES } from '../types';
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
  const t = useT();
  const project = useProject(id);
  const branding = usePublicBranding();
  const stats = useProjectStats();
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
    return <p className="py-16 text-center text-sm text-text-secondary">{t('proj.notFound')}</p>;
  }
  const p = project.data;

  // Projekt firmowy („bank godzin"): klientem jest nasza własna firma.
  // clientName z projektu (admin) albo z project_stats (pracownik — RLS ukrywa klienta).
  const clientName = p.client?.name ?? stats.data?.[p.id]?.clientName ?? null;
  const companyName = branding.data?.companyName ?? null;
  const isInternal =
    !!clientName &&
    !!companyName &&
    clientName.trim().toLowerCase() === companyName.trim().toLowerCase();
  const logoUrl =
    isInternal && branding.data?.logoPath ? logoPublicUrl(branding.data.logoPath) : null;

  // Wiersze karty info: dla projektu firmowego bez daty realizacji.
  const showTermRow = !isInternal && (p.start_date || p.end_date);
  const showInfoGroup = !!p.client || !!p.address || showTermRow || canFinance;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/projekty')}
        className="press flex items-center gap-1 self-start text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> {t('nav.projects')}
      </button>

      <Card
        className="relative overflow-hidden"
        style={
          isInternal
            ? { backgroundImage: 'linear-gradient(180deg, var(--color-accent-soft), transparent 62%)' }
            : undefined
        }
      >
        <div className="h-1.5" style={{ backgroundColor: p.color ?? '#CC0000' }} />
        {logoUrl && (
          <img
            aria-hidden
            alt=""
            src={logoUrl}
            className="pointer-events-none absolute -right-4 top-1/2 size-28 -translate-y-1/2 object-contain"
            style={{ opacity: 0.13 }}
          />
        )}
        <div className="relative flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold">{p.name}</h1>
            {!isInternal && (
              <Badge tone={PROJECT_STATUS_TONES[p.status]}>
                {t(`pstatus.${p.status}`)}
              </Badge>
            )}
          </div>
          {p.description && <p className="text-sm text-text-secondary">{p.description}</p>}
        </div>
      </Card>

      {/* Projekt firmowy: krótki opis, do czego służy „bank godzin" */}
      {isInternal && (
        <p className="rounded-(--radius-card) bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {t('proj.companyHint')}
        </p>
      )}

      {p.address && <ProjectMap address={p.address} />}

      {showInfoGroup && (
      <ListGroup>
        {p.client && (
          <ListRow
            leading={<Contact className="size-5 text-text-secondary" />}
            title={p.client.name}
            subtitle={t('proj.client')}
            chevron
            onClick={() => navigate(`/klienci/${p.client?.id}`)}
          />
        )}
        {p.address && (
          <ListRow
            leading={<MapPin className="size-5 text-text-secondary" />}
            title={p.address}
            subtitle={t('proj.buildAddress')}
            trailing={<CopyButton value={p.address} label={t('proj.addressCopy')} />}
          />
        )}
        {showTermRow && (
          <ListRow
            leading={<CalendarDays className="size-5 text-text-secondary" />}
            title={`${p.start_date ? date(p.start_date) : '…'} – ${p.end_date ? date(p.end_date) : '…'}`}
            subtitle={t('proj.term')}
          />
        )}
        {canFinance && (
          <ListRow
            leading={<Banknote className="size-5 text-text-secondary" />}
            title={[
              t(`billing.${p.billing_type}`),
              p.hourly_rate != null && p.billing_type !== 'fixed'
                ? `${num(p.hourly_rate)} kr/h`
                : null,
              p.fixed_value != null && p.billing_type !== 'hourly'
                ? moneyWhole(p.fixed_value)
                : null,
            ]
              .filter(Boolean)
              .join(' • ')}
            subtitle={t('proj.billingRow')}
          />
        )}
      </ListGroup>
      )}

      {canFinance && <ProjectInvoiceSection projectId={p.id} />}

      {/* Projekt firmowy: dla pracownika chowamy aktywności i prace dodatkowe
          oraz sumę godzin — zostaje dodawanie godzin i zdjęcia. Admin ma wszystko. */}
      {(!isInternal || isAdmin) && <ProjectActivitiesSection projectId={p.id} />}
      <ProjectHoursSection project={p} />
      {can('expenses_add') || can('expenses_view_all') ? (
        <ProjectExpensesSection projectId={p.id} />
      ) : null}
      {(!isInternal || isAdmin) && <AdditionalWorksSection projectId={p.id} />}
      <ProjectPhotosSection projectId={p.id} />

      {canEdit && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              icon={<Pencil className="size-5" />}
              onClick={() => setEditOpen(true)}
            >
              {t('common.edit')}
            </Button>
            <Button
              variant="secondary"
              icon={<RefreshCw className="size-5" />}
              onClick={() => setStatusOpen(true)}
            >
              {t('proj.changeStatus')}
            </Button>
          </div>
          {isAdmin && (
            <Button
              variant="destructive"
              icon={<Trash2 className="size-5" />}
              onClick={() => setConfirmDelete(true)}
            >
              {t('proj.deleteProject')}
            </Button>
          )}
        </div>
      )}

      <ProjectFormSheet open={editOpen} onClose={() => setEditOpen(false)} project={p} />

      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title={t('proj.changeStatus')}>
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
              {t(`pstatus.${s}`)}
            </Button>
          ))}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title={t('proj.deleteTitle')}
        description={t('proj.deleteDesc', { name: p.name })}
        confirmLabel={t('common.delete')}
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

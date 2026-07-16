import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  House,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Trash2,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useSession } from '@/features/auth/SessionProvider';
import { useT } from '@/lib/i18n/context';
import { useClientProjects } from '@/features/projects/hooks';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { ProjectFormSheet } from '@/features/projects/components/ProjectFormSheet';
import { useClient, useDeleteClient } from '../hooks';
import { ClientFormSheet } from '../components/ClientFormSheet';

export default function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { can } = useSession();
  const t = useT();
  const client = useClient(id);
  const projects = useClientProjects(id);
  const deleteClient = useDeleteClient();
  const [editOpen, setEditOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canEdit = can('clients_edit');

  if (client.isLoading) return <SkeletonList rows={5} />;
  if (!client.data) {
    return <p className="py-16 text-center text-sm text-text-secondary">{t('cli.notFound')}</p>;
  }
  const c = client.data;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/klienci')}
        className="press flex items-center gap-1 self-start text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> {t('nav.clients')}
      </button>

      <Card className="flex items-center gap-4 p-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-surface">
          {c.type === 'company' ? (
            <Building2 className="size-7 text-text-secondary" strokeWidth={1.8} />
          ) : (
            <User className="size-7 text-text-secondary" strokeWidth={1.8} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{c.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge>{c.type === 'company' ? t('cli.company') : t('cli.private')}</Badge>
            {c.reverse_vat && <Badge tone="info">omvänd byggmoms</Badge>}
            {c.rot_eligible && <Badge tone="success">ROT</Badge>}
          </div>
        </div>
      </Card>

      <ListGroup>
        {c.org_or_person_nr && (
          <ListRow
            leading={<Building2 className="size-5 text-text-secondary" />}
            title={c.org_or_person_nr}
            subtitle={c.type === 'company' ? 'Organisationsnummer' : 'Personnummer'}
          />
        )}
        {c.phone && (
          <ListRow
            leading={<Phone className="size-5 text-text-secondary" />}
            title={<a href={`tel:${c.phone}`}>{c.phone}</a>}
            subtitle={t('cli.phone')}
          />
        )}
        {c.email && (
          <ListRow
            leading={<Mail className="size-5 text-text-secondary" />}
            title={<a href={`mailto:${c.email}`}>{c.email}</a>}
            subtitle={t('cli.email')}
          />
        )}
        {c.address && (
          <ListRow
            leading={<MapPin className="size-5 text-text-secondary" />}
            title={c.address}
            subtitle={t('cli.address')}
          />
        )}
        {c.notes && (
          <ListRow
            leading={<StickyNote className="size-5 text-text-secondary" />}
            title={c.notes}
            subtitle={t('cli.notes')}
          />
        )}
      </ListGroup>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('cli.clientProjects')}</h2>
          {can('projects_edit') && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => setProjectFormOpen(true)}
            >
              {t('cli.newBtn')}
            </Button>
          )}
        </div>
        {(projects.data?.length ?? 0) === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-sm text-text-secondary">
            <House className="size-5" /> {t('cli.noProjects')}
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.data?.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            icon={<Pencil className="size-5" />}
            onClick={() => setEditOpen(true)}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="destructive"
            icon={<Trash2 className="size-5" />}
            onClick={() => setConfirmDelete(true)}
          >
            {t('common.delete')}
          </Button>
        </div>
      )}

      <ClientFormSheet open={editOpen} onClose={() => setEditOpen(false)} client={c} />
      <ProjectFormSheet
        open={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        project={null}
        presetClientId={id}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t('cli.deleteTitle')}
        description={t('cli.deleteDesc', { name: c.name })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteClient.isPending}
        onConfirm={() =>
          deleteClient.mutate(id, {
            onSuccess: () => navigate('/klienci', { replace: true }),
            onSettled: () => setConfirmDelete(false),
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

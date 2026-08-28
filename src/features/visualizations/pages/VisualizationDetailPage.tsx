import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Eye, MapPin, Pencil, Send, Trash2 } from 'lucide-react';
import { qk } from '@/lib/queryKeys';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { date as fmtDate } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { usePublicBranding } from '@/features/auth/hooks';
import { useCompanyDetails } from '@/features/settings/hooks';
import { logoPublicUrl } from '@/features/settings/api';
import { ensureVizToken, vizPublicUrl } from '../api';
import {
  useDeleteVisualization,
  usePointCreators,
  usePublishVisualization,
  useSendVisualizationEmail,
  useVisualization,
} from '../hooks';
import { buildVizEmailHtml, buildVizEmailSubject } from '../emailTemplate';

export default function VisualizationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { can } = useSession();
  const branding = usePublicBranding();
  const company = useCompanyDetails(true);
  const queryClient = useQueryClient();

  const query = useVisualization(id);
  const publishMut = usePublishVisualization();
  const deleteVizMut = useDeleteVisualization();
  const sendMut = useSendVisualizationEmail();

  const [confirmDelViz, setConfirmDelViz] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState('');

  const isManager = can('visualizations_manage');
  const isWorker = can('visualizations_work');
  const viz = query.data?.visualization ?? null;
  const pts = query.data?.points ?? [];
  const pointCount = pts.length;
  const doneCount = pts.filter((p) => p.status === 'done').length;
  const todoCount = pointCount - doneCount;
  const skyliftCount = pts.filter((p) => p.requires_equipment).length;
  const creators = usePointCreators(viz?.created_by ? [viz.created_by] : []);
  const author = viz?.created_by ? creators.data?.[viz.created_by] : undefined;

  // Token z góry, aby „Podgląd"/„Kopiuj link" działały w geście (iOS).
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (!isManager || !viz || viz.public_token || ensuredRef.current) return;
    ensuredRef.current = true;
    ensureVizToken(id)
      .then(() => queryClient.invalidateQueries({ queryKey: qk.visualizations.detail(id) }))
      .catch(() => {
        ensuredRef.current = false;
      });
  }, [isManager, viz, id, queryClient]);

  const handleCopyLink = () => {
    const token = viz?.public_token;
    if (!token) return;
    navigator.clipboard
      .writeText(vizPublicUrl(token))
      .then(() => toast.success(t('viz.linkCopied')))
      .catch(() => toast.error(t('viz.errSend')));
  };

  const handlePreview = () => {
    const token = viz?.public_token;
    if (!token) return;
    navigate(`/visualisering/${token}?podglad=1`);
  };

  const handleSend = async () => {
    const to = email.trim();
    if (!to) return;
    try {
      const token = await publishMut.mutateAsync(id);
      const companyName =
        company.data?.name?.trim() || branding.data?.companyName?.trim() || 'BFTM Fasad & Bygg AB';
      const html = buildVizEmailHtml({
        clientName: viz?.client?.name ?? '',
        vizTitle: viz?.title ?? '',
        url: vizPublicUrl(token),
        companyName,
        logoUrl: branding.data?.logoPath ? logoPublicUrl(branding.data.logoPath) : null,
        email: company.data?.email?.trim() || 'kontakt@bftm.se',
        website: 'www.bftm.se',
        contacts: company.data?.contacts ?? [],
      });
      await sendMut.mutateAsync({ to, subject: buildVizEmailSubject(viz?.title ?? ''), html });
      setSendOpen(false);
      setEmail('');
    } catch {
      /* toast w hooku */
    }
  };

  if (query.isLoading) return <SkeletonList rows={5} />;
  if (!viz) return <Card className="p-4 text-sm text-text-secondary">{t('viz.empty')}</Card>;

  const info: Array<{ label: string; value: ReactNode }> = [];
  if (viz.client?.name)
    info.push({ label: t('viz.clientLabel').replace(/\s*\(.*\)/, ''), value: viz.client.name });
  if (viz.address) info.push({ label: t('viz.addressLabel'), value: viz.address });
  info.push({
    label: t('viz.views'),
    value: (
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-4 text-text-secondary" /> {viz.view_count}
      </span>
    ),
  });
  info.push({ label: t('viz.pointsTotal'), value: String(pointCount) });
  info.push({ label: t('viz.createdAtLabel'), value: fmtDate(viz.created_at) });
  if (viz.created_by)
    info.push({
      label: t('viz.author'),
      value: (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <Avatar
            name={author?.name ?? '—'}
            path={author?.avatar_path ?? null}
            size="sm"
            className="size-5 text-[8px]"
          />
          {author?.name ?? '—'}
        </span>
      ),
    });

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/wizualizacje')}
        className="press flex items-center gap-1 text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="size-4" /> {t('nav.visualizations')}
      </button>

      {/* Karta informacyjna */}
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold">{viz.title || t('viz.untitled')}</h2>
          <Badge tone={viz.status === 'sent' ? 'success' : 'neutral'}>
            {viz.status === 'sent' ? t('viz.statusSent') : t('viz.statusDraft')}
          </Badge>
        </div>
        <dl className="flex flex-col gap-1.5 text-sm">
          {info.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt className="text-text-secondary">{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Rozbicie punktów — niezrobione / gotowe / skylift */}
      {pointCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile color="#cc0000" count={todoCount} label={t('viz.statusTodo')} />
          <StatTile color="#2e7d32" count={doneCount} label={t('viz.statusDone')} />
          <StatTile color="#64748b" skylift count={skyliftCount} label={t('viz.requiresEquipment')} />
        </div>
      )}

      {/* Dodawanie / praca na punktach — dla managera i pracownika */}
      {(isManager || isWorker) && (
        <Button
          fullWidth
          size="lg"
          icon={<MapPin className="size-5" />}
          onClick={() => navigate(`/wizualizacje/${id}/punkty`)}
        >
          {t('viz.addPoints')}
        </Button>
      )}

      {/* Akcje administratora */}
      {isManager && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            icon={<Pencil className="size-4" />}
            onClick={() => navigate(`/wizualizacje/${id}/edytuj`)}
          >
            {t('viz.editTitle')}
          </Button>
          <Button icon={<Send className="size-4" />} onClick={() => setSendOpen(true)}>
            {viz.status === 'sent' ? t('viz.resend') : t('viz.send')}
          </Button>
          <Button
            variant="secondary"
            icon={<Copy className="size-4" />}
            disabled={!viz.public_token}
            onClick={handleCopyLink}
          >
            {t('viz.copyLink')}
          </Button>
          <Button
            variant="secondary"
            icon={<Eye className="size-4" />}
            disabled={!viz.public_token}
            onClick={handlePreview}
          >
            {t('viz.openPreview')}
          </Button>
          <Button
            variant="ghost"
            className="col-span-2 text-error"
            style={{ backgroundColor: 'var(--color-error-soft)' }}
            icon={<Trash2 className="size-4" />}
            onClick={() => setConfirmDelViz(true)}
          >
            {t('viz.delete')}
          </Button>
        </div>
      )}

      {/* Sheet wysyłki */}
      <Sheet open={sendOpen} onClose={() => setSendOpen(false)} title={t('viz.sendTitle')}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">{t('viz.sendDesc')}</p>
          <Input
            label={t('viz.emailLabel')}
            type="email"
            placeholder={t('viz.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            fullWidth
            size="lg"
            icon={<Send className="size-5" />}
            loading={publishMut.isPending || sendMut.isPending}
            disabled={!email.trim()}
            onClick={handleSend}
          >
            {t('viz.sendBtn')}
          </Button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelViz}
        title={t('viz.delete')}
        description={t('viz.deleteConfirm')}
        destructive
        loading={deleteVizMut.isPending}
        onConfirm={async () => {
          await deleteVizMut.mutateAsync(id);
          navigate('/wizualizacje');
        }}
        onCancel={() => setConfirmDelViz(false)}
      />
    </div>
  );
}

function StatTile({
  color,
  count,
  label,
  skylift,
}: {
  color: string;
  count: number;
  label: string;
  skylift?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-2xl bg-surface px-2 py-3.5"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="flex items-baseline gap-1">
        {skylift && (
          <span className="text-sm font-extrabold" style={{ color }}>
            S
          </span>
        )}
        <span className="tabular-nums text-2xl font-bold" style={{ color }}>
          {count}
        </span>
      </div>
      <span className="text-[11px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}

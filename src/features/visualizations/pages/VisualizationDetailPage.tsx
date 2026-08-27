import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  Copy,
  Eye,
  ImagePlus,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Input, Textarea } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { usePublicBranding } from '@/features/auth/hooks';
import { useCompanyDetails } from '@/features/settings/hooks';
import { logoPublicUrl } from '@/features/settings/api';
import {
  ensureVizToken,
  removeVizPhoto,
  uploadVizPhoto,
  vizPhotoUrl,
  vizPublicUrl,
} from '../api';
import {
  useCreatePoint,
  useDeletePoint,
  useDeleteVisualization,
  usePublishVisualization,
  useSendVisualizationEmail,
  useUpdatePoint,
  useVisualization,
} from '../hooks';
import { bboxFromViz, hasMapKey, mapStyleUrl, paddedMaxBounds } from '../map';
import type { Bbox, VisualizationPoint } from '../types';
import { buildVizEmailHtml, buildVizEmailSubject } from '../emailTemplate';
import type { VizMapPoint } from '../components/VizMap';

const VizMap = lazy(() => import('../components/VizMap'));

type PointDraft = {
  id: string | null; // null = nowy punkt
  latitude: number;
  longitude: number;
  description: string;
  requires_equipment: boolean;
  status: 'todo' | 'done';
  before_path: string | null;
  after_path: string | null;
  created_by: string | null;
};

export default function VisualizationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { can, user } = useSession();
  const branding = usePublicBranding();
  const company = useCompanyDetails(true);

  const query = useVisualization(id);
  const createPoint = useCreatePoint(id);
  const updatePoint = useUpdatePoint(id);
  const deletePoint = useDeletePoint(id);
  const publishMut = usePublishVisualization();
  const deleteVizMut = useDeleteVisualization();
  const sendMut = useSendVisualizationEmail();

  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<PointDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelPoint, setConfirmDelPoint] = useState<VisualizationPoint | null>(null);
  const [confirmDelViz, setConfirmDelViz] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoSlot = useRef<'before' | 'after'>('before');

  const isManager = can('visualizations_manage');
  const isWorker = can('visualizations_work');

  const viz = query.data?.visualization ?? null;
  const points = useMemo(() => query.data?.points ?? [], [query.data]);

  const bbox: Bbox | null = useMemo(() => (viz ? bboxFromViz(viz) : null), [viz]);

  const maxBounds = useMemo(() => (bbox ? paddedMaxBounds(bbox, 0.2) : null), [bbox]);

  const canEditPoint = (p: { created_by: string | null }) =>
    isManager || (isWorker && !!user && p.created_by === user.id);

  // Punkty na mapie (+ ewentualny szkic nowego punktu).
  const mapPoints: VizMapPoint[] = useMemo(() => {
    const base = points.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      status: p.status,
    }));
    if (draft && draft.id === null) {
      base.push({ id: 'draft', latitude: draft.latitude, longitude: draft.longitude, status: draft.status });
    }
    return base;
  }, [points, draft]);

  const handleMapClick = (lng: number, lat: number) => {
    if (!addMode) return;
    setAddMode(false);
    setDraft({
      id: null,
      latitude: lat,
      longitude: lng,
      description: '',
      requires_equipment: false,
      status: 'todo',
      before_path: null,
      after_path: null,
      created_by: user?.id ?? null,
    });
  };

  const openPoint = (pointId: string) => {
    const p = points.find((x) => x.id === pointId);
    if (!p) return;
    setDraft({ ...p });
  };

  const closeSheet = () => {
    setDraft(null);
    setUploading(false);
  };

  const pickPhoto = (slot: 'before' | 'after') => {
    photoSlot.current = slot;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draft) return;
    setUploading(true);
    try {
      const path = await uploadVizPhoto(id, file);
      // usuń poprzednie zdjęcie w tym slocie, jeśli było
      const prev = photoSlot.current === 'before' ? draft.before_path : draft.after_path;
      if (prev) void removeVizPhoto(prev);
      setDraft((d) =>
        d ? { ...d, [photoSlot.current === 'before' ? 'before_path' : 'after_path']: path } : d,
      );
    } catch {
      toast.error(t('viz.errPhoto'));
    } finally {
      setUploading(false);
    }
  };

  const savePoint = async () => {
    if (!draft) return;
    const editable = draft.id === null || canEditPoint(draft);
    if (!editable) return;
    try {
      if (draft.id === null) {
        await createPoint.mutateAsync({
          visualization_id: id,
          latitude: draft.latitude,
          longitude: draft.longitude,
          description: draft.description.trim(),
          requires_equipment: draft.requires_equipment,
          status: draft.status,
          before_path: draft.before_path,
          after_path: draft.after_path,
          created_by: user?.id ?? null,
        });
      } else {
        await updatePoint.mutateAsync({
          id: draft.id,
          patch: {
            description: draft.description.trim(),
            requires_equipment: draft.requires_equipment,
            status: draft.status,
            before_path: draft.before_path,
            after_path: draft.after_path,
          },
        });
      }
      toast.success(t('viz.pointSaved'));
      closeSheet();
    } catch {
      /* toast w hooku */
    }
  };

  const doDeletePoint = async () => {
    if (!confirmDelPoint) return;
    await deletePoint.mutateAsync(confirmDelPoint);
    setConfirmDelPoint(null);
    closeSheet();
  };

  const handleCopyLink = async () => {
    try {
      const token = viz?.public_token ?? (await ensureVizToken(id));
      await navigator.clipboard.writeText(vizPublicUrl(token));
      toast.success(t('viz.linkCopied'));
    } catch {
      toast.error(t('viz.errSend'));
    }
  };

  const handlePreview = async () => {
    const token = viz?.public_token ?? (await ensureVizToken(id));
    window.open(vizPublicUrl(token, true), '_blank');
  };

  const handleSend = async () => {
    const to = email.trim();
    if (!to) return;
    try {
      const token = await publishMut.mutateAsync(id); // nadaje token + status sent
      const companyName = company.data?.name?.trim() || branding.data?.companyName?.trim() || 'BFTM Fasad & Bygg AB';
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

  const draftEditable = draft ? draft.id === null || canEditPoint(draft) : false;

  return (
    <div className="flex flex-col gap-3">
      {/* Nagłówek: tytuł + status + akcje admina */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{viz.title || t('viz.untitled')}</h2>
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            {[viz.client?.name ?? null, viz.address ?? null].filter(Boolean).join(' • ')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={viz.status === 'sent' ? 'success' : 'neutral'}>
            {viz.status === 'sent' ? t('viz.statusSent') : t('viz.statusDraft')}
          </Badge>
          {viz.status === 'sent' && (
            <span className="tabular-nums flex items-center gap-1 text-xs text-text-secondary">
              <Eye className="size-3.5" /> {viz.view_count}
            </span>
          )}
        </div>
      </div>

      {/* Mapa */}
      <Card className="relative overflow-hidden p-0">
        {hasMapKey() ? (
          <Suspense fallback={<div className="h-[62vh] animate-pulse bg-surface" />}>
            <VizMap
              styleUrl={mapStyleUrl()}
              bbox={bbox}
              maxBounds={maxBounds}
              points={mapPoints}
              activePointId={draft?.id ?? (draft ? 'draft' : null)}
              onMapClick={handleMapClick}
              onPointClick={openPoint}
              crosshair={addMode}
              className="h-[62vh] w-full"
            />
          </Suspense>
        ) : (
          <div className="flex h-[62vh] items-center justify-center p-4 text-center text-sm text-text-secondary">
            {t('viz.missingKey')}
          </div>
        )}

        {/* Pasek trybu dodawania */}
        {addMode && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-accent/90 px-4 py-2 text-xs font-medium text-white backdrop-blur">
            <span>{t('viz.pickHint')}</span>
            <button onClick={() => setAddMode(false)} aria-label="X">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Przycisk + (dodawanie punktu) */}
        {(isManager || isWorker) && hasMapKey() && !draft && (
          <button
            onClick={() => setAddMode((v) => !v)}
            aria-label={t('viz.addPoint')}
            className="press absolute right-4 bottom-4 z-10 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 active:bg-accent-hover"
          >
            {addMode ? <X className="size-7" /> : <Plus className="size-7" />}
          </button>
        )}
      </Card>

      {/* Akcje administratora */}
      {isManager && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => navigate(`/wizualizacje/${id}/edytuj`)}>
            {t('viz.editTitle')}
          </Button>
          <Button icon={<Send className="size-4" />} onClick={() => setSendOpen(true)}>
            {viz.status === 'sent' ? t('viz.resend') : t('viz.send')}
          </Button>
          <Button variant="secondary" icon={<Copy className="size-4" />} onClick={handleCopyLink}>
            {t('viz.copyLink')}
          </Button>
          <Button variant="secondary" icon={<Eye className="size-4" />} onClick={handlePreview}>
            {t('viz.openPreview')}
          </Button>
          <Button
            variant="ghost"
            className="col-span-2 text-error"
            icon={<Trash2 className="size-4" />}
            onClick={() => setConfirmDelViz(true)}
          >
            {t('viz.delete')}
          </Button>
        </div>
      )}

      {/* Ukryty input pliku */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {/* Sheet punktu */}
      <Sheet
        open={!!draft}
        onClose={closeSheet}
        title={draft?.id === null ? t('viz.pointNew') : t('viz.pointEdit')}
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <Textarea
              label={t('viz.description')}
              placeholder={t('viz.descriptionPlaceholder')}
              rows={4}
              value={draft.description}
              disabled={!draftEditable}
              onChange={(e) => setDraft((d) => (d ? { ...d, description: e.target.value } : d))}
            />

            <Switch
              label={t('viz.requiresEquipment')}
              description={t('viz.requiresEquipmentHint')}
              checked={draft.requires_equipment}
              disabled={!draftEditable}
              onChange={(v) => setDraft((d) => (d ? { ...d, requires_equipment: v } : d))}
            />

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {draft.status === 'done' ? t('viz.statusDone') : t('viz.statusTodo')}
              </span>
              {draftEditable && (
                <Button
                  size="sm"
                  variant={draft.status === 'done' ? 'secondary' : 'primary'}
                  icon={<Check className="size-4" />}
                  onClick={() =>
                    setDraft((d) => (d ? { ...d, status: d.status === 'done' ? 'todo' : 'done' } : d))
                  }
                >
                  {draft.status === 'done' ? t('viz.markTodo') : t('viz.markDone')}
                </Button>
              )}
            </div>

            {/* Zdjęcie przed */}
            <PhotoField
              label={t('viz.beforePhoto')}
              path={draft.before_path}
              editable={draftEditable}
              uploading={uploading && photoSlot.current === 'before'}
              onPick={() => pickPhoto('before')}
              onRemove={() => {
                if (draft.before_path) void removeVizPhoto(draft.before_path);
                setDraft((d) => (d ? { ...d, before_path: null } : d));
              }}
              addLabel={t('viz.addPhoto')}
              changeLabel={t('viz.changePhoto')}
              removeLabel={t('viz.removePhoto')}
              uploadingLabel={t('viz.uploading')}
            />

            {/* Zdjęcie po */}
            <PhotoField
              label={t('viz.afterPhoto')}
              path={draft.after_path}
              editable={draftEditable}
              uploading={uploading && photoSlot.current === 'after'}
              onPick={() => pickPhoto('after')}
              onRemove={() => {
                if (draft.after_path) void removeVizPhoto(draft.after_path);
                setDraft((d) => (d ? { ...d, after_path: null } : d));
              }}
              addLabel={t('viz.addPhoto')}
              changeLabel={t('viz.changePhoto')}
              removeLabel={t('viz.removePhoto')}
              uploadingLabel={t('viz.uploading')}
            />

            {draftEditable ? (
              <Button
                fullWidth
                size="lg"
                loading={createPoint.isPending || updatePoint.isPending}
                onClick={savePoint}
              >
                {draft.id === null ? t('viz.addPoint') : t('viz.savePoint')}
              </Button>
            ) : (
              <p className="text-center text-xs text-text-secondary">{t('viz.cannotDeleteOthers')}</p>
            )}

            {draft.id !== null && canEditPoint(draft) && (
              <Button
                variant="ghost"
                fullWidth
                className="text-error"
                icon={<Trash2 className="size-4" />}
                onClick={() => {
                  const p = points.find((x) => x.id === draft.id);
                  if (p) setConfirmDelPoint(p);
                }}
              >
                {t('viz.deletePoint')}
              </Button>
            )}
          </div>
        )}
      </Sheet>

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
        open={!!confirmDelPoint}
        title={t('viz.deletePoint')}
        description={t('viz.deletePointConfirm')}
        destructive
        loading={deletePoint.isPending}
        onConfirm={doDeletePoint}
        onCancel={() => setConfirmDelPoint(null)}
      />
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

interface PhotoFieldProps {
  label: string;
  path: string | null;
  editable: boolean;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
  addLabel: string;
  changeLabel: string;
  removeLabel: string;
  uploadingLabel: string;
}

function PhotoField({
  label,
  path,
  editable,
  uploading,
  onPick,
  onRemove,
  addLabel,
  changeLabel,
  removeLabel,
  uploadingLabel,
}: PhotoFieldProps) {
  const url = path ? vizPhotoUrl(path) : null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {url && (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={url} alt={label} className="max-h-56 w-full rounded-xl object-cover" />
      )}
      {editable && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ImagePlus className="size-4" />}
            loading={uploading}
            onClick={onPick}
          >
            {uploading ? uploadingLabel : url ? changeLabel : addLabel}
          </Button>
          {url && (
            <Button variant="ghost" size="sm" className="text-error" onClick={onRemove}>
              {removeLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

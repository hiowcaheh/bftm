import { Suspense, lazy, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  ImagePlus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { dateTime } from '@/lib/format';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { removeVizPhoto, uploadVizPhoto, vizPhotoUrl } from '../api';
import {
  useCreatePoint,
  useDeletePoint,
  usePointCreators,
  useUpdatePoint,
  useVisualization,
} from '../hooks';
import { bboxFromViz, hasMapKey, mapStyleUrl, paddedMaxBounds } from '../map';
import { VizLegend } from '../components/VizLegend';
import { StatusSlider } from '../components/StatusSlider';
import type { Bbox, VisualizationPoint } from '../types';
import type { VizMapPoint } from '../components/VizMap';

const VizMap = lazy(() => import('../components/VizMap'));

type PointDraft = {
  id: string | null;
  latitude: number;
  longitude: number;
  description: string;
  requires_equipment: boolean;
  status: 'todo' | 'done';
  before_path: string | null;
  after_path: string | null;
  created_by: string | null;
  created_at?: string;
  done_at?: string | null;
  done_by?: string | null;
};

export default function VisualizationPointsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { can, user } = useSession();

  const query = useVisualization(id);
  const createPoint = useCreatePoint(id);
  const updatePoint = useUpdatePoint(id);
  const deletePoint = useDeletePoint(id);

  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<PointDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<VisualizationPoint | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoSlot = useRef<'before' | 'after'>('before');

  const isManager = can('visualizations_manage');
  const isWorker = can('visualizations_work');

  const viz = query.data?.visualization ?? null;
  const points = useMemo(() => query.data?.points ?? [], [query.data]);
  const creators = usePointCreators([
    ...points.map((p) => p.created_by ?? ''),
    ...points.map((p) => p.done_by ?? ''),
  ]);

  const doneCount = points.filter((p) => p.status === 'done').length;
  const skyliftDone = points.filter((p) => p.requires_equipment && p.status === 'done').length;
  const skyliftTodo = points.filter((p) => p.requires_equipment && p.status === 'todo').length;

  const bbox: Bbox | null = useMemo(() => (viz ? bboxFromViz(viz) : null), [viz]);
  const maxBounds = useMemo(() => (bbox ? paddedMaxBounds(bbox, 0.2) : null), [bbox]);

  // Edycja: manager i pracownik mogą edytować KAŻDY punkt.
  const canEditPoint = () => isManager || isWorker;
  // Usuwanie: manager dowolny; pracownik tylko własne punkty.
  const canDeletePoint = (p: { created_by: string | null }) =>
    isManager || (isWorker && !!user && p.created_by === user.id);

  const mapPoints: VizMapPoint[] = useMemo(() => {
    const base: VizMapPoint[] = points.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      status: p.status,
      skylift: p.requires_equipment,
    }));
    if (draft && draft.id === null) {
      base.push({
        id: 'draft',
        latitude: draft.latitude,
        longitude: draft.longitude,
        status: draft.status,
        skylift: draft.requires_equipment,
      });
    }
    return base;
  }, [points, draft]);

  const handleMapClick = (lng: number, lat: number) => {
    if (!addMode) return;
    if (
      bbox &&
      (lat > bbox.north || lat < bbox.south || lng > bbox.east || lng < bbox.west)
    ) {
      toast.error(t('viz.outsideArea'));
      return;
    }
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
    if (p) setDraft({ ...p });
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
    const editable = canEditPoint();
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

  const doDelete = async () => {
    if (!confirmDel) return;
    await deletePoint.mutateAsync(confirmDel);
    setConfirmDel(null);
    closeSheet();
  };

  const draftEditable = draft ? canEditPoint() : false;
  const creator = draft?.created_by ? creators.data?.[draft.created_by] : undefined;
  const doneUser = draft?.done_by ? creators.data?.[draft.done_by] : undefined;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neutral-900">
      {/* Navbar: cofnij + nazwa wizualizacji */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b border-black/10 bg-bg/90 px-3 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-12 items-center gap-2">
          <button
            onClick={() => navigate(`/wizualizacje/${id}`)}
            aria-label={t('nav.visualizations')}
            className="press flex items-center gap-1 text-sm font-medium text-text-secondary"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="truncate text-sm font-semibold">
            {viz?.title || t('viz.untitled')}
          </span>
        </div>
      </div>

      {/* Mapa pełnoekranowa */}
      {hasMapKey() ? (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-neutral-800">
              <div className="size-8 animate-spin rounded-full border-3 border-white/25 border-t-white" />
            </div>
          }
        >
          <VizMap
            styleUrl={mapStyleUrl()}
            bbox={bbox}
            drawArea
            maxBounds={maxBounds}
            points={mapPoints}
            activePointId={draft?.id ?? (draft ? 'draft' : null)}
            onMapClick={handleMapClick}
            onPointClick={openPoint}
            crosshair={addMode}
            className="h-full w-full"
          />
        </Suspense>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-300">
          {t('viz.missingKey')}
        </div>
      )}

      {/* Legenda punktów — poniżej paska nawigacji */}
      <VizLegend
        todoLabel={t('viz.statusTodo')}
        doneLabel={t('viz.statusDone')}
        skyliftLabel={t('viz.requiresEquipment')}
        totalLabel={t('viz.pointsTotal')}
        todoCount={points.length - doneCount}
        doneCount={doneCount}
        skyliftTodo={skyliftTodo}
        skyliftDone={skyliftDone}
        total={points.length}
        style={{ top: 'calc(env(safe-area-inset-top) + 3.75rem)' }}
      />

      {/* Pasek trybu dodawania */}
      {addMode && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-accent/90 px-4 py-3 text-center text-sm font-medium text-white backdrop-blur">
          {t('viz.pickHint')}
        </div>
      )}

      {/* Przycisk + */}
      {(isManager || isWorker) && hasMapKey() && !draft && (
        <button
          onClick={() => setAddMode((v) => !v)}
          aria-label={t('viz.addPoint')}
          className="press absolute right-5 bottom-6 z-20 flex size-15 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 active:bg-accent-hover"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {addMode ? <X className="size-7" /> : <Plus className="size-8" />}
        </button>
      )}

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

            <StatusSlider
              status={draft.status}
              disabled={!draftEditable}
              todoLabel={t('viz.statusTodo')}
              doneLabel={t('viz.statusDone')}
              onChange={(s) => setDraft((d) => (d ? { ...d, status: s } : d))}
            />

            <PhotoField
              tone="before"
              label={t('viz.beforePhoto')}
              path={draft.before_path}
              editable={draftEditable}
              uploading={uploading && photoSlot.current === 'before'}
              onPick={() => pickPhoto('before')}
              onRemove={() => {
                if (draft.before_path) void removeVizPhoto(draft.before_path);
                setDraft((d) => (d ? { ...d, before_path: null } : d));
              }}
              t={t}
            />
            <PhotoField
              tone="after"
              label={t('viz.afterPhoto')}
              path={draft.after_path}
              editable={draftEditable}
              uploading={uploading && photoSlot.current === 'after'}
              onPick={() => pickPhoto('after')}
              onRemove={() => {
                if (draft.after_path) void removeVizPhoto(draft.after_path);
                setDraft((d) => (d ? { ...d, after_path: null } : d));
              }}
              t={t}
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
              <p className="text-center text-xs text-text-secondary">
                {t('viz.cannotDeleteOthers')}
              </p>
            )}

            {/* Audyt: kto dodał / kto zmienił status na gotowe */}
            {draft.id !== null && (draft.created_at || draft.done_at) && (
              <div className="flex flex-col gap-1.5 rounded-xl bg-surface px-3 py-2.5">
                {draft.created_at && (
                  <AuditRow
                    label={t('viz.createdBy')}
                    name={creator?.name ?? '—'}
                    avatar={creator?.avatar_path ?? null}
                    when={dateTime(draft.created_at)}
                  />
                )}
                {draft.done_at && (
                  <AuditRow
                    label={
                      draft.status === 'done'
                        ? t('viz.changedToDone')
                        : t('viz.changedToTodo')
                    }
                    labelColor={draft.status === 'done' ? '#2e7d32' : '#cc0000'}
                    icon={
                      draft.status === 'done' ? (
                        <CheckCircle2 className="size-3.5" style={{ color: '#2e7d32' }} />
                      ) : (
                        <RotateCcw className="size-3.5" style={{ color: '#cc0000' }} />
                      )
                    }
                    name={doneUser?.name ?? '—'}
                    avatar={doneUser?.avatar_path ?? null}
                    when={dateTime(draft.done_at)}
                  />
                )}
              </div>
            )}

            {draft.id !== null && canDeletePoint(draft) && (
              <Button
                variant="ghost"
                fullWidth
                className="text-error"
                icon={<Trash2 className="size-4" />}
                onClick={() => {
                  const p = points.find((x) => x.id === draft.id);
                  if (p) setConfirmDel(p);
                }}
              >
                {t('viz.deletePoint')}
              </Button>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={!!confirmDel}
        title={t('viz.deletePoint')}
        description={t('viz.deletePointConfirm')}
        destructive
        loading={deletePoint.isPending}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}

function AuditRow({
  label,
  name,
  avatar,
  when,
  icon,
  labelColor,
}: {
  label: string;
  name: string;
  avatar: string | null;
  when: string;
  icon?: ReactNode;
  labelColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} path={avatar} size="sm" className="size-6 text-[10px]" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-medium">{name}</p>
        <p className="flex items-center gap-1 text-[10px] text-text-secondary">
          {icon}
          <span style={labelColor ? { color: labelColor, fontWeight: 600 } : undefined}>
            {label}
          </span>
          <span>• {when}</span>
        </p>
      </div>
    </div>
  );
}

interface PhotoFieldProps {
  tone: 'before' | 'after';
  label: string;
  path: string | null;
  editable: boolean;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
  t: (key: string) => string;
}

function PhotoField({ tone, label, path, editable, uploading, onPick, onRemove, t }: PhotoFieldProps) {
  const url = path ? vizPhotoUrl(path) : null;
  const accent = tone === 'before' ? '#cc0000' : '#2e7d32';
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface/40">
      {/* Nagłówek sekcji zdjęcia — kolorowy pasek + tytuł */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderLeft: `4px solid ${accent}` }}>
        <ImageIcon className="size-4" style={{ color: accent }} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {url ? (
        <img src={url} alt={label} className="max-h-60 w-full object-cover" />
      ) : (
        <div className="flex h-24 items-center justify-center text-xs text-text-secondary">
          {editable ? t('viz.addPhoto') : '—'}
        </div>
      )}
      {editable && (
        <div className="grid grid-cols-2 gap-2 p-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<ImagePlus className="size-4" />}
            loading={uploading}
            onClick={onPick}
          >
            {uploading ? t('viz.uploading') : url ? t('viz.changePhoto') : t('viz.addPhoto')}
          </Button>
          {url ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-error"
              icon={<Trash2 className="size-4" />}
              onClick={onRemove}
            >
              {t('viz.removePhoto')}
            </Button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

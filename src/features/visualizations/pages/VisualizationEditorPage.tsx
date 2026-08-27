import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SkeletonList } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { useSession } from '@/features/auth/SessionProvider';
import { useClients } from '@/features/clients/hooks';
import { useClientProjects } from '@/features/projects/hooks';
import { useCreateVisualization, useUpdateVisualization, useVisualization } from '../hooks';
import { bboxFromCorners, bboxFromViz, geocode, hasMapKey, mapStyleUrl } from '../map';
import type { Bbox } from '../types';

const VizMap = lazy(() => import('../components/VizMap'));

interface Corner {
  lat: number;
  lng: number;
}

export default function VisualizationEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const t = useT();
  const { can } = useSession();
  const clients = useClients();

  const existing = useVisualization(id ?? null);
  const createMut = useCreateVisualization();
  const updateMut = useUpdateVisualization();

  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [center, setCenter] = useState<Corner | null>(null);
  const [corners, setCorners] = useState<Corner[]>([]);
  const [geocoding, setGeocoding] = useState(false);

  const projects = useClientProjects(clientId);

  // Prefill przy edycji.
  useEffect(() => {
    const v = existing.data?.visualization;
    if (!v) return;
    setClientId(v.client_id ?? '');
    setProjectId(v.project_id ?? '');
    setTitle(v.title ?? '');
    setAddress(v.address ?? '');
    if (v.latitude != null && v.longitude != null) {
      setCenter({ lat: v.latitude, lng: v.longitude });
    }
    const b = bboxFromViz(v);
    if (b) {
      // odtwórz jako dwa narożniki (SW, NE)
      setCorners([
        { lat: b.south, lng: b.west },
        { lat: b.north, lng: b.east },
      ]);
    }
  }, [existing.data]);

  const bbox: Bbox | null = useMemo(() => {
    const [a, b] = corners;
    if (!a || !b) return null;
    return bboxFromCorners(a, b);
  }, [corners]);

  const handleGeocode = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const r = await geocode(address);
      if (!r) {
        toast.error(t('viz.geocodeFail'));
        return;
      }
      setCenter({ lat: r.lat, lng: r.lng });
      setAddress(r.label);
      setCorners([]); // nowy adres → wyczyść obszar
    } catch {
      toast.error(t('viz.geocodeFail'));
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapClick = (lng: number, lat: number) => {
    setCorners((prev) => (prev.length >= 2 ? [{ lat, lng }] : [...prev, { lat, lng }]));
  };

  const canSave = !!center && !!bbox && !createMut.isPending && !updateMut.isPending;

  const handleSave = async () => {
    if (!center) {
      toast.error(t('viz.addrRequired'));
      return;
    }
    if (!bbox) {
      toast.error(t('viz.areaRequired'));
      return;
    }
    const payload = {
      client_id: clientId || null,
      project_id: projectId || null,
      title: title.trim() || null,
      address: address.trim() || null,
      latitude: center.lat,
      longitude: center.lng,
      bbox_north: bbox.north,
      bbox_south: bbox.south,
      bbox_east: bbox.east,
      bbox_west: bbox.west,
    };
    try {
      if (isEdit && id) {
        await updateMut.mutateAsync({ id, patch: payload });
        toast.success(t('viz.saved'));
        navigate(`/wizualizacje/${id}`);
      } else {
        const newId = await createMut.mutateAsync(payload);
        toast.success(t('viz.saved'));
        navigate(`/wizualizacje/${newId}`);
      }
    } catch {
      /* toast w hooku */
    }
  };

  if (!can('visualizations_manage')) {
    return <Card className="p-4 text-sm text-text-secondary">{t('viz.cannotDeleteOthers')}</Card>;
  }
  if (isEdit && existing.isLoading) return <SkeletonList rows={4} />;

  const clientOptions = [
    { value: '', label: t('viz.clientNone') },
    ...(clients.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const projectOptions = [
    { value: '', label: t('viz.projectNone') },
    ...(projects.data ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Card className="flex flex-col gap-3 p-4">
        <Select
          label={t('viz.clientLabel')}
          options={clientOptions}
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setProjectId('');
          }}
        />
        {clientId && (projects.data ?? []).length > 0 && (
          <Select
            label={t('viz.projectLabel')}
            options={projectOptions}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        )}
        <Input
          label={t('viz.titleLabel')}
          placeholder={t('viz.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label={t('viz.addressLabel')}
              placeholder={t('viz.addressPlaceholder')}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleGeocode();
                }
              }}
            />
          </div>
          <Button
            variant="secondary"
            icon={<Search className="size-4" />}
            loading={geocoding}
            onClick={handleGeocode}
          >
            {t('viz.geocode')}
          </Button>
        </div>
      </Card>

      {center && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line px-4 py-2.5 text-xs text-text-secondary">
            {bbox ? t('viz.areaSet') : t('viz.areaHint')}
          </div>
          {hasMapKey() ? (
            <Suspense fallback={<div className="h-72 animate-pulse bg-surface" />}>
              <VizMap
                styleUrl={mapStyleUrl()}
                center={center}
                zoom={17}
                bbox={bbox}
                crosshair
                onMapClick={handleMapClick}
                className="h-72 w-full"
              />
            </Suspense>
          ) : (
            <div className="flex h-72 items-center justify-center p-4 text-center text-sm text-text-secondary">
              {t('viz.missingKey')}
            </div>
          )}
          {bbox && (
            <div className="border-t border-line px-4 py-2.5">
              <button
                className="text-xs font-semibold text-accent"
                onClick={() => setCorners([])}
              >
                {t('viz.areaReset')}
              </button>
            </div>
          )}
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Button
            fullWidth
            size="lg"
            icon={<MapPin className="size-5" />}
            disabled={!canSave}
            loading={createMut.isPending || updateMut.isPending}
            onClick={handleSave}
          >
            {t('viz.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

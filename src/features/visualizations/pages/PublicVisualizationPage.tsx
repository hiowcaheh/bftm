import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPinned, Wrench, X } from 'lucide-react';
import { logoPublicUrl } from '@/features/settings/api';
import { usePublicBranding } from '@/features/auth/hooks';
import { usePublicVisualization } from '../hooks';
import { hasBbox, hasMapKey, mapStyleUrl, paddedMaxBounds } from '../map';
import { vizPhotoUrl } from '../api';
import { VizLegend } from '../components/VizLegend';
import type { Bbox, PublicVizPoint } from '../types';
import type { VizMapPoint } from '../components/VizMap';

const VizMap = lazy(() => import('../components/VizMap'));
const NAVY = '#1E2A44';

/** Ekran ładowania w szacie maila: granat + logo + szwedzki tekst. */
function LoadingScreen({ logo, name }: { logo: string | null; name: string }) {
  return (
    <div
      className="flex h-dvh flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ backgroundColor: NAVY }}
    >
      {logo ? (
        <img src={logo} alt={name} className="max-w-[240px]" />
      ) : (
        <div className="text-2xl font-bold tracking-wide text-white">{name}</div>
      )}
      <div className="flex flex-col items-center gap-3">
        <div className="size-9 animate-spin rounded-full border-3 border-white/25 border-t-[#cc0000]" />
        <p className="text-sm text-white/70">Laddar visualisering…</p>
      </div>
    </div>
  );
}

/** Trwały identyfikator sesji publicznej — deduplikacja licznika (odświeżenie nie nabija). */
function getSessionId(): string {
  const KEY = 'viz_session';
  try {
    let s = localStorage.getItem(KEY);
    if (!s) {
      s = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, s);
    }
    return s;
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/**
 * Publiczny widok wizualizacji (link z tokenem) — pełny ekran mapy, bez logo
 * ani nagłówka. Klient tylko czyta; kliknięcie punktu otwiera panel ze szczegółami.
 */
export default function PublicVisualizationPage() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isPreview = searchParams.get('podglad') === '1';
  const [session] = useState(getSessionId);
  const query = usePublicVisualization(token, !isPreview, session);
  const branding = usePublicBranding();
  const [active, setActive] = useState<PublicVizPoint | null>(null);

  // noindex — wizualizacje klientów nie mają trafiać do wyszukiwarek.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const data = query.data;

  const bbox: Bbox | null = useMemo(
    () => (data && hasBbox(data.bbox) ? (data.bbox as Bbox) : null),
    [data],
  );
  const maxBounds = useMemo(() => (bbox ? paddedMaxBounds(bbox, 0.2) : null), [bbox]);
  const mapPoints: VizMapPoint[] = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        status: p.status,
        skylift: p.requires_equipment,
      })),
    [data],
  );

  const brandName = branding.data?.companyName?.trim() || 'BFTM Fasad & Bygg AB';
  const brandLogo = branding.data?.logoPath ? logoPublicUrl(branding.data.logoPath) : null;

  if (query.isLoading) {
    return <LoadingScreen logo={brandLogo} name={brandName} />;
  }

  if (!data) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-neutral-100 p-6 text-center">
        <MapPinned className="size-10 text-neutral-400" />
        <p className="text-sm text-neutral-500">
          Visualiseringen hittades inte eller är inte längre tillgänglig.
        </p>
      </div>
    );
  }

  const openPoint = (pointId: string) => {
    const p = data.points.find((x) => x.id === pointId);
    if (p) setActive(p);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neutral-900">
      {/* Mapa na pełnym ekranie */}
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
            drawArea={false}
            maxBounds={maxBounds}
            points={mapPoints}
            onPointClick={openPoint}
            className="h-full w-full"
          />
        </Suspense>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-300">
          Kartan är inte tillgänglig.
        </div>
      )}

      {/* Legenda (po szwedzku) */}
      <VizLegend
        todoLabel="Ej klart"
        doneLabel="Klart"
        skyliftLabel="Skylift"
        totalLabel="Punkter"
        total={data.points.length}
      />

      {/* Podgląd z aplikacji: dyskretny przycisk zamknięcia (klient go nie widzi) */}
      {isPreview && (
        <button
          aria-label="Stäng"
          onClick={() => navigate(-1)}
          className="press absolute top-4 left-4 z-10 flex size-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
          style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
        >
          <X className="size-5" />
        </button>
      )}

      {/* Panel punktu (bottom sheet, tylko odczyt) */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            aria-label="Stäng"
            className="absolute inset-0 bg-black/40"
            onClick={() => setActive(null)}
          />
          <div className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: active.status === 'done' ? '#2e7d32' : '#cc0000' }}
              >
                {active.status === 'done' ? 'Klart' : 'Ej klart'}
              </span>
              <button
                aria-label="Stäng"
                onClick={() => setActive(null)}
                className="p-1 text-neutral-500"
              >
                <X className="size-5" />
              </button>
            </div>

            {active.description && (
              <p className="mb-4 text-[15px] leading-relaxed whitespace-pre-line text-neutral-800">
                {active.description}
              </p>
            )}

            {active.requires_equipment && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                <Wrench className="size-4" /> Skylift
              </div>
            )}

            {active.before_path && (
              <figure className="mb-3">
                <figcaption className="mb-1 text-xs font-medium text-neutral-500">Före</figcaption>
                <img
                  src={vizPhotoUrl(active.before_path)}
                  alt="Före"
                  className="w-full rounded-xl object-cover"
                />
              </figure>
            )}
            {active.after_path && (
              <figure>
                <figcaption className="mb-1 text-xs font-medium text-neutral-500">Efter</figcaption>
                <img
                  src={vizPhotoUrl(active.after_path)}
                  alt="Efter"
                  className="w-full rounded-xl object-cover"
                />
              </figure>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

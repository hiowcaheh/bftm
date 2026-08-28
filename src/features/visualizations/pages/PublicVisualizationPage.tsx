import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPinned, Truck, X } from 'lucide-react';
import { dateTime } from '@/lib/format';
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

/** Ekran ładowania w szacie maila: granat + logo + szwedzki tekst.
 *  Dopóki branding się ładuje — zamiast tekstu nazwy pokazujemy pustą przestrzeń
 *  (żeby nie mignął napis przed logo). Nazwa tylko gdy firma nie ma logo. */
function LoadingScreen({ logo, name, ready }: { logo: string | null; name: string; ready: boolean }) {
  return (
    <div
      className="flex h-dvh flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ backgroundColor: NAVY }}
    >
      <div className="flex h-16 items-center justify-center">
        {logo ? (
          <img src={logo} alt={name} className="max-h-16 max-w-[240px]" />
        ) : ready ? (
          <div className="text-2xl font-bold tracking-wide text-white">{name}</div>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="size-9 animate-spin rounded-full border-3 border-white/25 border-t-[#cc0000]" />
        <p className="text-sm text-white/70">Laddar visualisering…</p>
      </div>
    </div>
  );
}

/** Trwały identyfikator sesji publicznej — deduplikacja licznika. */
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
 * Publiczny widok wizualizacji (link z tokenem) — pełny ekran mapy z cienką
 * belką (nazwa) na górze. Klient tylko czyta; kliknięcie punktu = panel.
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

  // Minimalny czas trwania ekranu ładowania — żeby logo zdążyło się pokazać.
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 1400);
    return () => clearTimeout(t);
  }, []);

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

  if (query.isLoading || !minElapsed) {
    return <LoadingScreen logo={brandLogo} name={brandName} ready={!branding.isLoading} />;
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
  const doneCount = data.points.filter((p) => p.status === 'done').length;
  const skyliftDone = data.points.filter((p) => p.requires_equipment && p.status === 'done').length;
  const skyliftTodo = data.points.filter((p) => p.requires_equipment && p.status === 'todo').length;
  const title = data.title || brandName;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neutral-900">
      {/* Belka górna: nazwa wizualizacji (+ zamknięcie w podglądzie) */}
      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-black/55 px-3 text-white backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-12 w-full items-center gap-2">
          {isPreview && (
            <button
              aria-label="Stäng"
              onClick={() => navigate(-1)}
              className="press flex size-8 items-center justify-center rounded-full bg-white/15"
            >
              <X className="size-4" />
            </button>
          )}
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
      </div>

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

      {/* Legenda (po szwedzku) — poniżej belki */}
      <VizLegend
        todoLabel="Ej klart"
        doneLabel="Klart"
        skyliftLabel="Skylift"
        totalLabel="Punkter"
        todoCount={data.points.length - doneCount}
        doneCount={doneCount}
        skyliftTodo={skyliftTodo}
        skyliftDone={skyliftDone}
        total={data.points.length}
        style={{ top: 'calc(env(safe-area-inset-top) + 3.75rem)' }}
      />

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
              {/* Status + skylift w jednym rzędzie */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: active.status === 'done' ? '#2e7d32' : '#cc0000' }}
                >
                  {active.status === 'done' ? 'Klart' : 'Ej klart'}
                </span>
                {active.requires_equipment && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <Truck className="size-3.5" /> Skylift
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  aria-label="Stäng"
                  onClick={() => setActive(null)}
                  className="p-1 text-neutral-500"
                >
                  <X className="size-5" />
                </button>
                {active.status === 'done' && active.done_at && (
                  <span className="text-[11px] whitespace-nowrap text-neutral-500">
                    Klart {dateTime(active.done_at)}
                  </span>
                )}
              </div>
            </div>

            {active.description && (
              <p className="mb-4 text-[15px] leading-relaxed whitespace-pre-line text-neutral-800">
                {active.description}
              </p>
            )}

            {active.before_path && (
              <figure className="mb-3 overflow-hidden rounded-xl border border-neutral-200">
                <figcaption
                  className="px-3 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: '#cc0000' }}
                >
                  Före
                </figcaption>
                <img src={vizPhotoUrl(active.before_path)} alt="Före" className="w-full object-cover" />
              </figure>
            )}
            {active.after_path && (
              <figure className="overflow-hidden rounded-xl border border-neutral-200">
                <figcaption
                  className="px-3 py-2 text-xs font-semibold text-white"
                  style={{ backgroundColor: '#2e7d32' }}
                >
                  Efter
                </figcaption>
                <img src={vizPhotoUrl(active.after_path)} alt="Efter" className="w-full object-cover" />
              </figure>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

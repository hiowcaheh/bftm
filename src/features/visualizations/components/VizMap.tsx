import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Bbox } from '../types';
import { bboxPolygon, bboxToLngLatBounds, hasBbox } from '../map';

export interface VizMapPoint {
  id: string;
  latitude: number;
  longitude: number;
  status: 'todo' | 'done';
  /** Wymaga skyliftu — na punkcie pokazujemy małą literkę „S". */
  skylift?: boolean;
}

interface VizMapProps {
  styleUrl: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  /** Dopasuj widok do tego obszaru. */
  bbox?: Bbox | null;
  /** Rysuj czerwony prostokąt obszaru (tylko edycja/dodawanie punktów). */
  drawArea?: boolean;
  /** Ograniczenie przesuwania mapy (klient / widok obszaru). */
  maxBounds?: [[number, number], [number, number]] | null;
  points?: VizMapPoint[];
  activePointId?: string | null;
  onMapClick?: (lng: number, lat: number) => void;
  onPointClick?: (id: string) => void;
  /** Kursor krzyżyka — tryb dodawania punktu / narożnika. */
  crosshair?: boolean;
  className?: string;
}

const COLOR = { todo: '#cc0000', done: '#2e7d32' };

/** Marker jako mały kolorowy punkt z białą obwódką (lekki, nie „ciężki pin").
 *  Wszystkie punkty tego samego rozmiaru; skylift ma białą literkę „S". */
function makeMarkerEl(
  status: 'todo' | 'done',
  active: boolean,
  skylift: boolean,
): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText =
    'width:30px;height:30px;display:flex;align-items:center;justify-content:center;' +
    'background:transparent;border:0;cursor:pointer;padding:0;';
  const size = 16; // jednakowy rozmiar dla wszystkich punktów
  const dot = document.createElement('span');
  dot.style.cssText =
    `width:${size}px;height:${size}px;border-radius:9999px;` +
    `background:${COLOR[status]};` +
    'border:2.5px solid #fff;' +
    `box-shadow:0 1px 4px rgba(0,0,0,.45)${active ? ',0 0 0 3px rgba(255,255,255,.6)' : ''};` +
    'transition:box-shadow .15s;' +
    'display:flex;align-items:center;justify-content:center;' +
    'color:#fff;font-size:9px;font-weight:800;line-height:1;font-family:system-ui,sans-serif;';
  if (skylift) dot.textContent = 'S';
  btn.appendChild(dot);
  return btn;
}

export default function VizMap({
  styleUrl,
  center,
  zoom,
  bbox,
  drawArea = true,
  maxBounds,
  points = [],
  activePointId,
  onMapClick,
  onPointClick,
  crosshair,
  className,
}: VizMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const clickCbRef = useRef(onMapClick);
  const pointCbRef = useRef(onPointClick);
  clickCbRef.current = onMapClick;
  pointCbRef.current = onPointClick;

  // Inicjalizacja mapy raz.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: center ? [center.lng, center.lat] : [15.5, 62],
      zoom: zoom ?? (center ? 16 : 4),
      attributionControl: { compact: true },
      maxBounds: maxBounds ?? undefined,
    });
    // Zoom po lewej na dole — prawy górny róg zajmuje legenda, prawy dolny „+".
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    map.on('click', (e) => clickCbRef.current?.(e.lngLat.lng, e.lngLat.lat));

    map.on('load', () => {
      if (hasBbox(bbox)) {
        if (drawArea) {
          map.addSource('viz-bbox', { type: 'geojson', data: bboxPolygon(bbox) });
          map.addLayer({
            id: 'viz-bbox-fill',
            type: 'fill',
            source: 'viz-bbox',
            paint: { 'fill-color': '#cc0000', 'fill-opacity': 0.08 },
          });
          map.addLayer({
            id: 'viz-bbox-line',
            type: 'line',
            source: 'viz-bbox',
            paint: { 'line-color': '#cc0000', 'line-width': 2, 'line-opacity': 0.7 },
          });
        }
        map.fitBounds(bboxToLngLatBounds(bbox), { padding: 40, animate: false });
      }
    });
    mapRef.current = map;
    const markers = markersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl]);

  // Kursor krzyżyka w trybie dodawania.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = crosshair ? 'crosshair' : '';
  }, [crosshair]);

  // maxBounds po zmianie.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMaxBounds(maxBounds ?? null);
  }, [maxBounds]);

  // Aktualizacja obszaru (bbox) — źródło + dopasowanie.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource('viz-bbox') as maplibregl.GeoJSONSource | undefined;
      if (hasBbox(bbox)) {
        if (drawArea) {
          const poly = bboxPolygon(bbox);
          if (src) {
            src.setData(poly);
          } else {
            map.addSource('viz-bbox', { type: 'geojson', data: poly });
            map.addLayer({
              id: 'viz-bbox-fill',
              type: 'fill',
              source: 'viz-bbox',
              paint: { 'fill-color': '#cc0000', 'fill-opacity': 0.08 },
            });
            map.addLayer({
              id: 'viz-bbox-line',
              type: 'line',
              source: 'viz-bbox',
              paint: { 'line-color': '#cc0000', 'line-width': 2, 'line-opacity': 0.7 },
            });
          }
        } else if (src) {
          // tryb podglądu klienta — usuń prostokąt, zostaw samo dopasowanie
          if (map.getLayer('viz-bbox-fill')) map.removeLayer('viz-bbox-fill');
          if (map.getLayer('viz-bbox-line')) map.removeLayer('viz-bbox-line');
          map.removeSource('viz-bbox');
        }
        map.fitBounds(bboxToLngLatBounds(bbox), { padding: 40, animate: true });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [bbox, drawArea]);

  // Diff markerów punktów.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const existing = markersRef.current;
    const seen = new Set<string>();

    for (const p of points) {
      seen.add(p.id);
      const active = p.id === activePointId;
      const el = makeMarkerEl(p.status, active, !!p.skylift);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        pointCbRef.current?.(p.id);
      });
      const prev = existing.get(p.id);
      if (prev) prev.remove();
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map);
      existing.set(p.id, marker);
    }
    // usuń markery nieobecne w danych
    for (const [id, marker] of existing) {
      if (!seen.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }
  }, [points, activePointId]);

  return <div ref={containerRef} className={className} />;
}

// Warstwa mapy: MapTiler (satelita/hybryda + geocoding) przez MapLibre GL.
// Klucz publiczny trzymany w VITE_MAPTILER_KEY (sekret repo, ograniczony do domeny).
// Wszystko tutaj, żeby ewentualna zmiana dostawcy dotknęła jednego pliku.

import type { Feature, Polygon } from 'geojson';
import type { Bbox } from './types';

/** Luźny kształt z możliwymi nullami (wiersz wizualizacji / dane publiczne). */
type NullableBbox = {
  north: number | null;
  south: number | null;
  east: number | null;
  west: number | null;
};

const KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

export function hasMapKey(): boolean {
  return typeof KEY === 'string' && KEY.length > 0;
}

/** Styl mapy: hybryda (satelita + etykiety ulic) — najlepsze dla budowlanki. */
export function mapStyleUrl(): string {
  return `https://api.maptiler.com/maps/hybrid/style.json?key=${KEY}`;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
  /** bbox z geokodera, jeśli dostępny (do wstępnego przybliżenia). */
  bbox?: Bbox;
}

/**
 * Adres → współrzędne (MapTiler Geocoding). Jedno zapytanie przy zapisie,
 * więc mieści się w darmowym limicie. Priorytet dla Szwecji.
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q || !hasMapKey()) return null;
  const url =
    `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json` +
    `?key=${KEY}&country=se&limit=1&language=sv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('geocode');
  const data = (await res.json()) as {
    features?: Array<{
      center: [number, number];
      place_name?: string;
      text?: string;
      bbox?: [number, number, number, number];
    }>;
  };
  const f = data.features?.[0];
  if (!f) return null;
  const [lng, lat] = f.center;
  const out: GeocodeResult = { lat, lng, label: f.place_name ?? f.text ?? q };
  if (f.bbox) {
    const [west, south, east, north] = f.bbox;
    out.bbox = { west, south, east, north };
  }
  return out;
}

/** Bbox z dwóch narożników (dowolna kolejność). */
export function bboxFromCorners(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): Bbox {
  return {
    north: Math.max(a.lat, b.lat),
    south: Math.min(a.lat, b.lat),
    east: Math.max(a.lng, b.lng),
    west: Math.min(a.lng, b.lng),
  };
}

/** Bbox jako para [[west, south], [east, north]] — format LngLatBounds MapLibre. */
export function bboxToLngLatBounds(b: Bbox): [[number, number], [number, number]] {
  return [
    [b.west, b.south],
    [b.east, b.north],
  ];
}

/**
 * maxBounds z marginesem procentowym wokół obszaru — klient nie może
 * swobodnie podróżować po świecie, ale ma trochę luzu wokół obszaru.
 */
export function paddedMaxBounds(b: Bbox, pct = 0.15): [[number, number], [number, number]] {
  const dLat = Math.max((b.north - b.south) * pct, 0.001);
  const dLng = Math.max((b.east - b.west) * pct, 0.001);
  return [
    [b.west - dLng, b.south - dLat],
    [b.east + dLng, b.north + dLat],
  ];
}

/** GeoJSON prostokąta z bboxa — do narysowania obszaru na mapie. */
export function bboxPolygon(b: Bbox): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [b.west, b.south],
          [b.east, b.south],
          [b.east, b.north],
          [b.west, b.north],
          [b.west, b.south],
        ],
      ],
    },
  };
}

export function hasBbox(b: NullableBbox | null | undefined): b is Bbox {
  return (
    !!b &&
    b.north != null &&
    b.south != null &&
    b.east != null &&
    b.west != null
  );
}

/** Bbox z wiersza wizualizacji (kolumny bbox_*), albo null gdy niekompletny. */
export function bboxFromViz(v: {
  bbox_north: number | null;
  bbox_south: number | null;
  bbox_east: number | null;
  bbox_west: number | null;
}): Bbox | null {
  if (
    v.bbox_north == null ||
    v.bbox_south == null ||
    v.bbox_east == null ||
    v.bbox_west == null
  ) {
    return null;
  }
  return { north: v.bbox_north, south: v.bbox_south, east: v.bbox_east, west: v.bbox_west };
}

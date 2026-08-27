import type { Tables, VisualizationPointStatus, VisualizationStatus } from '@/types/database';

export type Visualization = Tables<'visualizations'>;
export type VisualizationPoint = Tables<'visualization_points'>;

export interface VisualizationWithClient extends Visualization {
  client: { id: string; name: string } | null;
}

/** Prosty bounding box (WGS84). */
export interface Bbox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Punkt w danych publicznych (klient) — kształt z RPC visualization_public. */
export interface PublicVizPoint {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  requires_equipment: boolean;
  status: VisualizationPointStatus;
  before_path: string | null;
  after_path: string | null;
}

/** Dane wizualizacji zwracane klientowi przez visualization_public (jsonb). */
export interface PublicVisualization {
  title: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  bbox: { north: number | null; south: number | null; east: number | null; west: number | null };
  points: PublicVizPoint[];
  branding: { name?: string; slogan?: string; logo_path?: string | null };
}

export const VIZ_STATUS_TONES: Record<VisualizationStatus, 'neutral' | 'success'> = {
  draft: 'neutral',
  sent: 'success',
};

import { useQuery } from '@tanstack/react-query';
import { Navigation, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Geo {
  lat: number;
  lon: number;
}

/** Geokodowanie adresu przez OpenStreetMap (Nominatim) — bez klucza API. */
async function geocode(address: string): Promise<Geo | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address,
  )}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('geocode failed');
  const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
  const first = arr[0];
  return first ? { lat: Number(first.lat), lon: Number(first.lon) } : null;
}

/**
 * Podgląd lokalizacji budowy (mapa OpenStreetMap) + przycisk otwierający
 * nawigację w Mapach Apple. Podgląd jest keyless; nawigacja w natywnej apce.
 */
export function ProjectMap({ address }: { address: string }) {
  const geo = useQuery({
    queryKey: ['geocode', address],
    queryFn: () => geocode(address),
    enabled: address.trim().length > 3,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const navUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
  const g = geo.data;

  return (
    <Card className="overflow-hidden">
      <div className="relative h-44 w-full bg-surface">
        {g ? (
          <iframe
            title="Mapa budowy"
            className="h-full w-full border-0"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${g.lon - 0.005}%2C${
              g.lat - 0.0028
            }%2C${g.lon + 0.005}%2C${g.lat + 0.0028}&layer=mapnik&marker=${g.lat}%2C${g.lon}`}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-xs text-text-secondary">
            <MapPin className="size-5" />
            {geo.isLoading ? 'Ładowanie mapy…' : 'Nie udało się zlokalizować adresu'}
          </div>
        )}
      </div>
      <a
        href={navUrl}
        target="_blank"
        rel="noreferrer"
        className="press flex h-12 items-center justify-center gap-2 border-t border-line text-sm font-semibold text-accent"
      >
        <Navigation className="size-4" /> Nawiguj do budowy
      </a>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Pasek offline: gdy telefon traci sieć, aplikacja działa dalej na
 * zapisanym cache (TanStack Query persist) — informujemy, że dane mogą
 * być nieaktualne. Znika po powrocie połączenia.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 flex items-center justify-center gap-2 bg-text px-4 py-1.5 text-xs font-medium text-white"
      style={{ top: 'calc(env(safe-area-inset-top) + 3rem)' }}
      role="status"
    >
      <WifiOff className="size-3.5" /> Brak połączenia — pokazujemy ostatnie dane
    </div>
  );
}

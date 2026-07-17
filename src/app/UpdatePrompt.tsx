import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/components/ui/Toast';
import { useSwUpdateStore } from '@/lib/swUpdate';
import { translate } from '@/lib/i18n/context';

/** Jak często aktywnie pytać serwer o nowy service worker. */
const UPDATE_CHECK_INTERVAL = 60_000;

/**
 * Strony publiczne (oferta/raport pod tokenem) ogląda klient końcowy —
 * nie pokazujemy mu toastu o aktualizacji aplikacji.
 */
const isPublicPage = () => /^#\/(oferta|raport)\//.test(window.location.hash);

/**
 * Rejestruje service workera, publikuje stan aktualizacji do store'a
 * (używa go Ustawienia → „Sprawdź aktualizację") i pokazuje toast
 * „Dostępna nowa wersja — Odśwież", gdy nowa wersja wykryje się sama.
 *
 * Aby nowe wersje łapały się szybko same, aktywnie odpytujemy serwer
 * co minutę oraz przy każdym powrocie do aplikacji (focus / widoczność).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const check = () => {
        if (registration.installing || !navigator.onLine) return;
        void registration.update().catch(() => undefined);
      };

      // cykliczne sprawdzanie w tle
      setInterval(check, UPDATE_CHECK_INTERVAL);

      // sprawdź natychmiast po powrocie do apki
      const onVisible = () => {
        if (document.visibilityState === 'visible') check();
      };
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('focus', check);
    },
  });
  const setNeedRefresh = useSwUpdateStore((s) => s.setNeedRefresh);
  const setUpdateFn = useSwUpdateStore((s) => s.setUpdateFn);

  useEffect(() => {
    setUpdateFn(updateServiceWorker);
  }, [updateServiceWorker, setUpdateFn]);

  useEffect(() => {
    setNeedRefresh(needRefresh);
    if (needRefresh && !isPublicPage()) {
      toast.info(translate('ui.newVersion'), {
        label: translate('ui.refresh'),
        icon: <RotateCw className="size-4" />,
        onClick: () => void updateServiceWorker(true),
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}

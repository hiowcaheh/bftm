import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/components/ui/Toast';
import { useSwUpdateStore } from '@/lib/swUpdate';

/**
 * Rejestruje service workera, publikuje stan aktualizacji do store'a
 * (używa go Ustawienia → „Sprawdź aktualizację") i pokazuje toast
 * „Dostępna nowa wersja — Odśwież", gdy nowa wersja wykryje się sama.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const setNeedRefresh = useSwUpdateStore((s) => s.setNeedRefresh);
  const setUpdateFn = useSwUpdateStore((s) => s.setUpdateFn);

  useEffect(() => {
    setUpdateFn(updateServiceWorker);
  }, [updateServiceWorker, setUpdateFn]);

  useEffect(() => {
    setNeedRefresh(needRefresh);
    if (needRefresh) {
      toast.info('Dostępna nowa wersja aplikacji', {
        label: 'Odśwież',
        onClick: () => void updateServiceWorker(true),
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}

import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/components/ui/Toast';

/** Toast „Dostępna nowa wersja — Odśwież" po wykryciu nowego service workera. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      toast.info('Dostępna nowa wersja aplikacji', {
        label: 'Odśwież',
        onClick: () => void updateServiceWorker(true),
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}

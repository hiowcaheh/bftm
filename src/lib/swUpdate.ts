import { create } from 'zustand';

/**
 * Stan aktualizacji service workera — zasilany przez UpdatePrompt
 * (useRegisterSW), używany przez Ustawienia → „Sprawdź aktualizację".
 */
interface SwUpdateState {
  needRefresh: boolean;
  updateFn: ((reload?: boolean) => Promise<void>) | null;
  setNeedRefresh: (value: boolean) => void;
  setUpdateFn: (fn: (reload?: boolean) => Promise<void>) => void;
}

export const useSwUpdateStore = create<SwUpdateState>((set) => ({
  needRefresh: false,
  updateFn: null,
  setNeedRefresh: (needRefresh) => set({ needRefresh }),
  setUpdateFn: (updateFn) => set({ updateFn }),
}));

/**
 * Aktywne sprawdzenie aktualizacji: pyta serwer o nowy service worker
 * i czeka do `timeoutMs` na jego wykrycie. Zwraca true, gdy jest nowa wersja.
 */
export async function checkForSwUpdate(timeoutMs = 10000): Promise<boolean | null> {
  const registration = await navigator.serviceWorker?.getRegistration();
  if (!registration) return null; // brak SW (np. tryb deweloperski)
  if (registration.waiting || useSwUpdateStore.getState().needRefresh) return true;

  await registration.update().catch(() => undefined);

  const started = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      if (registration.waiting || useSwUpdateStore.getState().needRefresh) {
        resolve(true);
      } else if (Date.now() - started > timeoutMs) {
        // limit czasu ZAWSZE wygrywa — nawet gdy instalacja utknęła,
        // nie kręcimy w nieskończoność (gdy dokończy się później,
        // UpdatePrompt i tak pokaże toast „nowa wersja")
        resolve(false);
      } else {
        setTimeout(poll, 250);
      }
    };
    poll();
  });
}

/** Instalacja czekającej wersji + przeładowanie aplikacji. */
export async function installSwUpdate(): Promise<void> {
  const { updateFn } = useSwUpdateStore.getState();
  if (updateFn) {
    await updateFn(true);
    return;
  }
  const registration = await navigator.serviceWorker?.getRegistration();
  registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  window.location.reload();
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, RotateCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSwUpdateStore } from '@/lib/swUpdate';
import { useT } from '@/lib/i18n/context';

/** Jak często aktywnie pytać serwer o nowy service worker. */
const UPDATE_CHECK_INTERVAL = 60_000;

/**
 * Strony publiczne (oferta/raport pod tokenem) ogląda klient końcowy —
 * nie pokazujemy mu okna o aktualizacji aplikacji.
 */
const isPublicPage = () =>
  /^#\/(oferta|raport|visualisering|wizualizacja)\//.test(window.location.hash);

/**
 * Rejestruje service workera, publikuje stan aktualizacji do store'a
 * (używa go Ustawienia → „Sprawdź aktualizację") i — gdy wykryje się nowa
 * wersja — pokazuje BLOKUJĄCE okno na środku ekranu. Pracownicy pomijali
 * toast u góry i zostawali na starej wersji, więc jedyne wyjście to
 * „Aktualizuj teraz" (bez X, klik w tło nic nie robi).
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
    // Strony publiczne (klient) aktualizują się same, bez pytania.
    if (needRefresh && isPublicPage()) void updateServiceWorker(true);
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  if (!needRefresh || isPublicPage()) return null;
  return <ForcedUpdateDialog onUpdate={() => updateServiceWorker(true)} />;
}

function ForcedUpdateDialog({ onUpdate }: { onUpdate: () => Promise<void> }) {
  const t = useT();
  const [installing, setInstalling] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Blokada przewijania pod spodem + fokus na jedynym przycisku
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    buttonRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const update = () => {
    if (installing) return;
    setInstalling(true);
    void onUpdate();
    // Gdyby SW nie przeładował strony (np. zawieszona instalacja) — przeładuj sami.
    setTimeout(() => window.location.reload(), 8000);
  };

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
      aria-describedby="force-update-desc"
      className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-md"
      // Esc i klik w tło celowo nic nie robią — jedyne wyjście to aktualizacja
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.preventDefault();
      }}
    >
      <div className="animate-sheet-up flex w-full max-w-sm flex-col items-center gap-2.5 rounded-3xl bg-white px-6 pt-7 pb-5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className="relative">
          <img
            src="/icons/icon-192.png"
            alt=""
            className="size-[76px] rounded-[18px] shadow-[0_6px_18px_rgba(204,0,0,0.25)]"
          />
          <span className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full border-[3px] border-white bg-accent text-white">
            <RotateCw className="size-4" strokeWidth={2.6} />
          </span>
        </div>
        <h2 id="force-update-title" className="mt-2.5 text-xl font-bold">
          {t('ui.forceUpdateTitle')}
        </h2>
        <p id="force-update-desc" className="text-sm leading-snug text-text-secondary">
          {t('ui.forceUpdateDesc')}
        </p>
        <button
          ref={buttonRef}
          type="button"
          disabled={installing}
          className="press mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-semibold text-white disabled:opacity-85"
          onClick={update}
        >
          {installing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <RotateCw className="size-5" strokeWidth={2.4} />
          )}
          {installing ? t('ui.forceUpdating') : t('ui.forceUpdateBtn')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

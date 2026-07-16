import { useEffect, useState } from 'react';
import { Download, Plus, Share, X } from 'lucide-react';

/** Zdarzenie beforeinstallprompt (Chrome/Android) — minimalny typ. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'bftm-install-dismissed';
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function dismissedRecently(): boolean {
  const v = localStorage.getItem(DISMISS_KEY);
  if (!v) return false;
  return Date.now() - Number(v) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Baner sugerujący instalację aplikacji na ekran główny, gdy działa w
 * przeglądarce (nie jako zainstalowana PWA). Android: natywne okno; iOS:
 * instrukcja (brak API). Zamknięcie zapamiętywane na 14 dni.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;

    if (isIOS()) {
      setIos(true);
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-3 z-40 animate-page-forward"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.75rem)' }}
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-(--shadow-fab)">
        <img
          src="/icons/icon-192.png"
          alt=""
          className="size-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Zainstaluj aplikację BFTM</p>
          {ios ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-text-secondary">
              Tapnij <Share className="inline size-3.5" /> na dole, potem
              <span className="inline-flex items-center gap-0.5">
                „Dodaj do ekranu głównego" <Plus className="inline size-3.5" />
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-text-secondary">
              Szybszy dostęp z ekranu głównego, jak zwykła aplikacja.
            </p>
          )}
        </div>

        {!ios && (
          <button
            type="button"
            onClick={() => void install()}
            className="press flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-white"
          >
            <Download className="size-4" /> Zainstaluj
          </button>
        )}
        <button
          type="button"
          aria-label="Zamknij"
          onClick={dismiss}
          className="press flex size-8 shrink-0 items-center justify-center rounded-lg text-text-secondary"
        >
          <X className="size-4.5" />
        </button>
      </div>
    </div>
  );
}

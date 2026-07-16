import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Plus, Share, X } from 'lucide-react';
import { useT } from '@/lib/i18n/context';

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
 * przeglądarce (nie jako zainstalowana PWA). Android: przycisk uruchamia
 * natywne okno instalacji. iOS: przycisk otwiera instrukcję (Apple nie daje
 * API do automatycznej instalacji). Zamknięcie zapamiętywane na 14 dni.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [guide, setGuide] = useState(false);
  const t = useT();

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
    if (ios) {
      setGuide(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-x-3 z-40 animate-page-forward"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.75rem)' }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-(--shadow-fab)">
          <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t('install.title')}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{t('install.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => void install()}
            className="press flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-white"
          >
            <Download className="size-4" /> {t('install.button')}
          </button>
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

      {/* iOS: Apple nie daje API instalacji — pokazujemy instrukcję */}
      {guide &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4"
            onClick={() => setGuide(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white p-5"
              style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <img src="/icons/icon-192.png" alt="" className="size-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold">{t('install.guideTitle')}</p>
                  <p className="text-xs text-text-secondary">{t('install.guideSub')}</p>
                </div>
                <button
                  type="button"
                  aria-label="Zamknij"
                  onClick={() => setGuide(false)}
                  className="press flex size-9 items-center justify-center rounded-full bg-surface text-text-secondary"
                >
                  <X className="size-5" />
                </button>
              </div>

              <ol className="flex flex-col gap-3">
                <li className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    1
                  </span>
                  <span className="flex flex-1 items-center gap-1.5 text-sm">
                    <Share className="inline size-5 text-accent" /> {t('install.step1')}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    2
                  </span>
                  <span className="flex flex-1 items-center gap-1.5 text-sm">
                    {t('install.step2')}
                    <Plus className="inline size-5 text-accent" />
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    3
                  </span>
                  <span className="flex-1 text-sm">{t('install.step3')}</span>
                </li>
              </ol>

              <p className="mt-4 text-center text-xs text-text-secondary">{t('install.note')}</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

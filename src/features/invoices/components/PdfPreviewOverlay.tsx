import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';
import { useT } from '@/lib/i18n/context';

type PdfJsModule = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfJsModule> | null = null;

/** Ładuje pdf.js + workera raz na sesję (leniwie, przy pierwszym podglądzie). */
async function loadPdfJs(): Promise<PdfJsModule> {
  pdfjsPromise ??= (async () => {
    const pdfjs = await import('pdfjs-dist');
    // ?worker: Vite sam tworzy workera z własnego chunku (.js) — omija problemy
    // z typem MIME dla .mjs na GitHub Pages, gdzie workerSrc bywa zawodny.
    const PdfWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')).default;
    pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
    return pdfjs;
  })();
  return pdfjsPromise;
}

interface PdfPreviewOverlayProps {
  open: boolean;
  blob: Blob | null;
  filename: string;
  onClose: () => void;
  onShare: () => void | Promise<void>;
}

/** Renderuje strony PDF (pdf.js, ładowany leniwie) jako obrazy w lightboxie
 *  (zamazane tło + X), działa też w PWA na iPhonie gdzie <iframe> bywa pusty. */
export function PdfPreviewOverlay({
  open,
  blob,
  filename,
  onClose,
  onShare,
}: PdfPreviewOverlayProps) {
  const t = useT();
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open || !blob) return;
    let cancelled = false;
    setPages([]);
    setError(false);
    setLoading(true);

    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const buf = await blob.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetWidth = Math.min(window.innerWidth, 820) - 24; // padding
        const out: string[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return;
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = ((targetWidth * dpr) / base.width) || 1;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          out.push(canvas.toDataURL('image/png'));
        }
        if (!cancelled) setPages(out);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, blob]);

  // Blokada przewijania tła + zamykanie klawiszem Escape gdy podgląd otwarty
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Pływający przycisk zamknięcia — jak w lightboxie ze zdjęciem */}
      <button
        type="button"
        aria-label={t('inv.closePreview')}
        className="press absolute right-4 z-10 flex size-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
        style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        onClick={onClose}
      >
        <X className="size-6" />
      </button>

      {/* Strony PDF jako karty (klik w tło zamyka; klik w kartę nie) */}
      <div
        className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: '1rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white/80" />
          </div>
        )}
        {error && !loading && (
          <p className="mt-8 text-sm text-white/90">{t('inv.previewErr')}</p>
        )}
        {pages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Strona ${i + 1}`}
            className="w-full max-w-[820px] rounded-xl bg-white shadow-2xl"
          />
        ))}
      </div>

      <div
        className="px-4 pt-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={sharing}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-input) bg-white text-sm font-semibold text-text shadow-lg disabled:opacity-60"
          onClick={() => {
            setSharing(true);
            void Promise.resolve(onShare()).finally(() => setSharing(false));
          }}
        >
          {sharing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Download className="size-5" /> Zapisz / wyślij PDF
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-white/60">{filename}</p>
      </div>
    </div>,
    document.body,
  );
}

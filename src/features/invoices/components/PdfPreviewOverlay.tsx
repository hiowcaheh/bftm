import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';

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
  title?: string;
  onClose: () => void;
  onShare: () => void | Promise<void>;
}

/** Renderuje strony PDF (pdf.js, ładowany leniwie) jako obrazy — działa też
 *  w PWA na iPhonie, gdzie <iframe> z PDF bywa pusty. Na dole przycisk wysyłki. */
export function PdfPreviewOverlay({
  open,
  blob,
  filename,
  title,
  onClose,
  onShare,
}: PdfPreviewOverlayProps) {
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

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-neutral-800">
      <div
        className="flex items-center justify-between gap-3 px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
      >
        <button
          type="button"
          aria-label="Zamknij"
          className="press flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
        <span className="truncate text-sm font-medium text-white">
          {title ?? 'Podgląd PDF'}
        </span>
        <span className="size-10" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-3 py-4">
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white/70" />
          </div>
        )}
        {error && !loading && (
          <p className="mt-8 text-sm text-white/80">Nie udało się wczytać podglądu.</p>
        )}
        {pages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Strona ${i + 1}`}
            className="w-full max-w-[820px] rounded-lg bg-white shadow-lg"
          />
        ))}
      </div>

      <div
        className="px-4 pt-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <button
          type="button"
          disabled={sharing}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-input) bg-white text-sm font-semibold text-text disabled:opacity-60"
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
        <p className="mt-1.5 text-center text-[11px] text-white/50">{filename}</p>
      </div>
    </div>,
    document.body,
  );
}

import { useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Images, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { date as fmtDate } from '@/lib/format';
import { useSession } from '@/features/auth/SessionProvider';
import type { PhotoWithUrl } from '../api';
import { useDeletePhoto, useProjectPhotos, useUploadPhotos } from '../hooks';

/** Galeria zdjęć projektu: siatka, multi-upload z kompresją, pełny ekran. */
export function ProjectPhotosSection({ projectId }: { projectId: string }) {
  const { user, can } = useSession();
  const photos = useProjectPhotos(projectId);
  const upload = useUploadPhotos(projectId);
  const deletePhoto = useDeletePhoto(projectId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const canUpload = can('photos_upload');

  const canDelete = (photo: PhotoWithUrl) =>
    user?.role === 'admin' || photo.created_by === user?.id;

  const list = photos.data ?? [];
  const preview = previewIndex !== null ? (list[previewIndex] ?? null) : null;

  // Swipe lewo/prawo przegląda zdjęcia projektu (nie przełącza zakładek —
  // podgląd ma data-noswipe, więc gest nawigacji aplikacji go omija)
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    if (!start || previewIndex === null || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    const next = previewIndex + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < list.length) setPreviewIndex(next);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="size-5 text-accent" strokeWidth={1.8} />
          <h2 className="text-base font-semibold">Zdjęcia</h2>
          {list.length > 0 && (
            <span className="text-xs text-text-secondary">({list.length})</span>
          )}
        </div>
        {canUpload && (
          <Button
            variant="ghost"
            size="sm"
            icon={<Camera className="size-4" />}
            loading={upload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            Dodaj
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-text-secondary">Brak zdjęć</p>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {list.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              className="press aspect-square overflow-hidden rounded-lg bg-surface"
              onClick={() => setPreviewIndex(i)}
            >
              {photo.url && (
                <img
                  src={photo.url}
                  alt={photo.caption ?? 'Zdjęcie projektu'}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length > 0) {
            upload.mutate({ files, userId: user?.id ?? null });
          }
          e.target.value = '';
        }}
      />

      {preview &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex flex-col bg-black"
            data-noswipe
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex items-center justify-between px-4 pb-2"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
            >
              <button
                type="button"
                aria-label="Zamknij"
                className="press flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
                onClick={() => setPreviewIndex(null)}
              >
                <X className="size-5" />
              </button>
              {list.length > 1 && (
                <span className="tabular-nums text-sm text-white/80">
                  {(previewIndex ?? 0) + 1} / {list.length}
                </span>
              )}
              {canDelete(preview) ? (
                <button
                  type="button"
                  aria-label="Usuń zdjęcie"
                  className="press flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-5" />
                </button>
              ) : (
                <span className="size-10" />
              )}
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-2">
              {preview.url && (
                <img
                  key={preview.id}
                  src={preview.url}
                  alt={preview.caption ?? 'Zdjęcie projektu'}
                  className="animate-fade-in max-h-full max-w-full object-contain"
                />
              )}
            </div>
            <p
              className="px-4 pt-2 text-center text-xs text-white/70"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
            >
              {fmtDate(preview.created_at)}
              {preview.caption ? ` • ${preview.caption}` : ''}
            </p>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć zdjęcie?"
        description="Zdjęcie zostanie trwale usunięte z projektu."
        confirmLabel="Usuń"
        destructive
        loading={deletePhoto.isPending}
        onConfirm={() => {
          if (preview) {
            deletePhoto.mutate(
              { id: preview.id, path: preview.path },
              {
                onSuccess: () => {
                  setConfirmDelete(false);
                  setPreviewIndex(null);
                },
              },
            );
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Card>
  );
}

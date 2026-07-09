import { useEffect, useRef, useState } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Panel wsuwany z prawej krawędzi (slide-in). Zamykanie: gest przeciągnięcia
 * w prawo, tap w overlay, przycisk X, klawisz Escape.
 */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setDragX(0);
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (startX.current === null) return;
    const delta = (e.touches[0]?.clientX ?? 0) - startX.current;
    if (delta > 0) setDragX(delta);
  };
  const onTouchEnd = () => {
    if (dragX > 90) onClose();
    else setDragX(0);
    startX.current = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Zamknij"
        className="animate-fade-in absolute inset-0 bg-black/40"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-drawer-in absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col',
          'bg-bg shadow-(--shadow-sheet)',
        )}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragX ? 'none' : 'transform 200ms ease',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="press flex size-9 items-center justify-center rounded-full bg-white text-text-secondary shadow-(--shadow-card)"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

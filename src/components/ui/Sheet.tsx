import { useEffect, useRef, useState } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Wysokość sheetu; 'auto' dopasowuje się do treści, 'tall' ~90dvh dla długich formularzy */
  height?: 'auto' | 'tall';
}

/**
 * Modal slide-up z uchwytem. Zamykanie: gest przeciągnięcia w dół,
 * tap w overlay, przycisk X, klawisz Escape.
 */
export function Sheet({ open, onClose, title, children, height = 'auto' }: SheetProps) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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
    if (!open) setDragY(0);
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (startY.current === null) return;
    const delta = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (delta > 0) setDragY(delta);
  };
  const onTouchEnd = () => {
    if (dragY > 120) onClose();
    else setDragY(0);
    startY.current = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Zamknij"
        className="animate-fade-in absolute inset-0 bg-black/40"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-sheet-up relative flex flex-col rounded-t-3xl bg-white shadow-(--shadow-sheet)',
          height === 'tall' ? 'h-[90dvh]' : 'max-h-[90dvh]',
        )}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? 'none' : 'transform 200ms ease',
        }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-3 pb-1"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-5 pt-1 pb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="press flex size-9 items-center justify-center rounded-full bg-surface text-text-secondary"
          >
            <X className="size-5" />
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-8"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

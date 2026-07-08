import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialog potwierdzenia — obowiązkowy dla wszystkich akcji destrukcyjnych. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <button
        aria-label="Anuluj"
        className="animate-fade-in absolute inset-0 bg-black/40"
        onClick={onCancel}
        tabIndex={-1}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="animate-toast-in relative w-full max-w-sm rounded-(--radius-card) bg-white p-6 shadow-(--shadow-card)"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <div className="mt-2 text-sm text-text-secondary">{description}</div>
        )}
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            fullWidth
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

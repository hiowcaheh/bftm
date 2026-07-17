import { createPortal } from 'react-dom';
import { Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';

interface TempPasswordDialogProps {
  open: boolean;
  password: string;
  email: string;
  onClose: () => void;
}

/**
 * Hasło tymczasowe pokazywane JEDEN raz — po zamknięciu nie da się go
 * odzyskać (w bazie jest tylko hash). Admin może zawsze zresetować ponownie.
 */
export function TempPasswordDialog({ open, password, email, onClose }: TempPasswordDialogProps) {
  const t = useT();
  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t('emp.pwCopied'));
    } catch {
      toast.error(t('emp.pwCopyErr'));
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="animate-fade-in absolute inset-0 bg-black/40" />
      <div
        role="alertdialog"
        aria-modal="true"
        className="animate-toast-in relative w-full max-w-sm rounded-(--radius-card) bg-white p-6 shadow-(--shadow-card)"
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent-soft">
          <KeyRound className="size-6 text-accent" />
        </div>
        <h2 className="text-lg font-semibold">{t('emp.tempPwTitle')}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t('emp.tempPwDesc', { email })}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="press mt-4 flex w-full items-center justify-between rounded-(--radius-input) border border-line bg-surface px-4 py-3"
        >
          <span className="font-mono text-lg font-semibold tracking-wider">{password}</span>
          <Copy className="size-5 text-text-secondary" />
        </button>
        <Button fullWidth className="mt-5" onClick={onClose}>
          {t('emp.savedPwClose')}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

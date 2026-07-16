import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from './Toast';

interface CopyButtonProps {
  value: string;
  /** Doprecyzowanie w toaście, np. „numer" → „Skopiowano numer". */
  label?: string;
  className?: string;
}

/** Mały przycisk kopiujący wartość do schowka (z krótkim potwierdzeniem). */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `Skopiowano ${label}` : 'Skopiowano');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Nie udało się skopiować');
    }
  };

  return (
    <button
      type="button"
      aria-label={label ? `Kopiuj ${label}` : 'Kopiuj'}
      onClick={(e) => {
        e.stopPropagation();
        void copy();
      }}
      className={
        'press flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-text-secondary ' +
        (className ?? '')
      }
    >
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
    </button>
  );
}

import type { ReactNode } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  /** Akcja np. „Odśwież" przy nowej wersji SW */
  action?: { label: string; onClick: () => void; icon?: ReactNode };
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string, action?: ToastItem['action']) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message, action) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, action }] }));
    // Toasty z akcją nie znikają same — czekają na decyzję użytkownika
    if (!action) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 3500);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** API dla całej aplikacji: toast.success('Zapisano'), toast.error('...') */
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  info: (message: string, action?: ToastItem['action']) =>
    useToastStore.getState().push('info', message, action),
};

const kindStyles: Record<ToastKind, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-success' },
  error: { icon: AlertCircle, className: 'text-error' },
  info: { icon: Info, className: 'text-info' },
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      {toasts.map((t) => {
        const { icon: Icon, className } = kindStyles[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-(--shadow-card) ring-1 ring-line"
            onClick={() => !t.action && dismiss(t.id)}
          >
            <Icon className={cn('size-5 shrink-0', className)} />
            <p className="flex-1 text-sm">{t.message}</p>
            {t.action && (
              <button
                type="button"
                className="press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white shadow-(--shadow-fab)"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.icon}
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

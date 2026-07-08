import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Przyjazny ekran awarii po polsku zamiast białej strony. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nieobsłużony błąd aplikacji:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-error-soft">
            <TriangleAlert className="size-8 text-error" />
          </div>
          <h1 className="text-lg font-semibold">Coś poszło nie tak</h1>
          <p className="text-sm text-text-secondary">
            Wystąpił nieoczekiwany błąd. Odśwież aplikację — jeśli problem wraca, skontaktuj
            się z administratorem.
          </p>
          <Button onClick={() => window.location.reload()}>Odśwież aplikację</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

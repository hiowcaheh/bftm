import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';

// iOS Safari ignoruje user-scalable=no w przeglądarce — blokujemy gest pinch-zoom
// bezpośrednio, żeby aplikacja zachowywała się jak natywna.
document.addEventListener('gesturestart', (e) => e.preventDefault());
import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { ErrorBoundary } from '@/app/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
);

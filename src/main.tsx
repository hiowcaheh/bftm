import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
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

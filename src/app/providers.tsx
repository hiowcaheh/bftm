import type { ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ToastViewport } from '@/components/ui/Toast';
import { UpdatePrompt } from './UpdatePrompt';

/**
 * Fundament efektu „zero ładowania": cache TanStack Query persystowany
 * do localStorage — każdy widok pokazuje ostatnie dane natychmiast,
 * a odświeżenie dzieje się cicho w tle.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 1000 * 60 * 60 * 24 * 14, // 14 dni w cache offline
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'bftm-query-cache',
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 14,
        // Zmiana bustera unieważnia stary cache po wdrożeniu niekompatybilnej wersji
        buster: 'v1',
      }}
    >
      {children}
      <ToastViewport />
      <UpdatePrompt />
    </PersistQueryClientProvider>
  );
}

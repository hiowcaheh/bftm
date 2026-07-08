import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * ATRAPA sesji na czas Etapu 1 — w Etapie 2 zastąpi ją prawdziwe
 * Supabase Auth (persistSession + onAuthStateChange). Żadne hasło nie jest
 * tu przechowywane ani porównywane; flaga służy tylko demonstracji nawigacji.
 */
interface MockAuthState {
  loggedIn: boolean;
  login: () => void;
  logout: () => void;
}

export const useMockAuth = create<MockAuthState>()(
  persist(
    (set) => ({
      loggedIn: false,
      login: () => set({ loggedIn: true }),
      logout: () => set({ loggedIn: false }),
    }),
    { name: 'bftm-mock-auth' },
  ),
);

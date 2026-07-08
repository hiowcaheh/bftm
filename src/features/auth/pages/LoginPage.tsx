import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useMockAuth } from '../store';

/**
 * Ekran logowania — w Etapie 1 atrapa (dowolne dane wpuszczają do środka).
 * W Etapie 2: prawdziwe Supabase Auth, mapowanie loginu „admin" na e-mail
 * administratora z ustawień, wymuszenie zmiany hasła, logo firmy z Storage.
 */
export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const doLogin = useMockAuth((s) => s.login);
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      toast.error('Podaj login i hasło');
      return;
    }
    setBusy(true);
    // Atrapa: symulacja krótkiej odpowiedzi serwera
    setTimeout(() => {
      doLogin();
      toast.success('Zalogowano (tryb demo)');
      navigate('/', { replace: true });
    }, 400);
  };

  return (
    <div
      className="animate-fade-in mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mb-10 flex flex-col items-center gap-4">
        {/* Placeholder logo — od Etapu 2 logo firmy z ustawień (publiczny odczyt) */}
        <div className="flex size-20 items-center justify-center rounded-3xl bg-accent shadow-(--shadow-fab)">
          <HardHat className="size-10 text-white" />
        </div>
        <h1 className="text-xl font-semibold">BFTM</h1>
        <p className="text-sm text-text-secondary">Zarządzanie firmą budowlaną</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Login lub e-mail"
          autoComplete="username"
          autoCapitalize="none"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <Input
          label="Hasło"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" size="lg" fullWidth loading={busy} className="mt-2">
          Zaloguj
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-text-secondary">
        Etap 1 — logowanie demonstracyjne. Prawdziwa autoryzacja pojawi się w Etapie 2.
      </p>
    </div>
  );
}

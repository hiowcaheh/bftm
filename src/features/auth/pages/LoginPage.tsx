import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabaseClient';
import { usePublicBranding, useSignIn } from '../hooks';

/**
 * Ekran logowania: logo i nazwa firmy z ustawień (publiczny odczyt),
 * pole „Login lub e-mail" (literalne „admin" mapuje się na e-mail
 * administratora), bez rejestracji i bez „przypomnij hasło" — reset
 * wykonuje administrator.
 */
export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const branding = usePublicBranding();
  const signIn = useSignIn();
  const navigate = useNavigate();

  const logoUrl = branding.data?.logoPath
    ? supabase.storage.from('logos').getPublicUrl(branding.data.logoPath).data.publicUrl
    : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      toast.error('Podaj login i hasło');
      return;
    }
    signIn.mutate(
      { login, password },
      // Nawigacją steruje router (RequireAuth), ale przekierowanie od razu
      // po sukcesie daje szybsze odczucie wejścia do aplikacji.
      { onSuccess: () => navigate('/', { replace: true }) },
    );
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
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo firmy"
            className="size-20 rounded-3xl object-contain shadow-(--shadow-card)"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-3xl bg-accent shadow-(--shadow-fab)">
            <HardHat className="size-10 text-white" />
          </div>
        )}
        <h1 className="text-xl font-semibold">{branding.data?.companyName ?? 'BFTM'}</h1>
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
        <Button type="submit" size="lg" fullWidth loading={signIn.isPending} className="mt-2">
          Zaloguj
        </Button>
      </form>
    </div>
  );
}

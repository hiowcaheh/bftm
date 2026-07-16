import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { supabase, setRememberMe } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n/context';
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
  const [remember, setRemember] = useState(true);
  const branding = usePublicBranding();
  const signIn = useSignIn();
  const navigate = useNavigate();
  const t = useT();

  const logoUrl = branding.data?.logoPath
    ? supabase.storage.from('logos').getPublicUrl(branding.data.logoPath).data.publicUrl
    : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      toast.error(t('auth.needCreds'));
      return;
    }
    setRememberMe(remember);
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
      <div className="mb-8 flex flex-col items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo firmy"
            className="max-h-56 w-full animate-fade-in object-contain"
          />
        ) : branding.isLoading ? (
          // delikatny placeholder w trakcie ładowania — bez migającej ikonki kasku
          <div className="h-28 w-40 animate-pulse rounded-3xl bg-surface" />
        ) : null}
        <h1 className="text-xl font-semibold">{branding.data?.companyName ?? 'BFTM'}</h1>
        {branding.data?.slogan && (
          <p className="text-center text-sm text-text-secondary italic">
            {branding.data.slogan}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('auth.loginLabel')}
          autoComplete="username"
          autoCapitalize="none"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setRemember((v) => !v)}
          className="-my-1 flex items-center gap-2.5 self-start text-left"
        >
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
              remember ? 'border-accent bg-accent text-white' : 'border-line bg-surface',
            )}
          >
            {remember && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <span className="text-sm">{t('auth.remember')}</span>
        </button>
        <Button type="submit" size="lg" fullWidth loading={signIn.isPending} className="mt-2">
          {t('auth.signIn')}
        </Button>
      </form>
    </div>
  );
}

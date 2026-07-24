import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { supabase, setRememberMe } from '@/lib/supabaseClient';
import { usePublicBranding, useSignIn } from '../hooks';

/**
 * Ekran logowania — wizytówka firmy, celowo po SZWEDZKU (jak strony publiczne):
 * to punkt wejścia do autoryzowanej aplikacji BFTM. Logo + watermark z małych
 * logo w tle (jak w aplikacji), pole „login/e-mail" (literalne „admin" mapuje
 * się na e-mail administratora), bez rejestracji i resetu (robi to admin).
 */
export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const branding = usePublicBranding();
  const signIn = useSignIn();
  const navigate = useNavigate();

  const logoUrl = branding.data?.logoPath
    ? supabase.storage.from('logos').getPublicUrl(branding.data.logoPath).data.publicUrl
    : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      toast.error('Ange användarnamn och lösenord');
      return;
    }
    setRememberMe(remember);
    signIn.mutate(
      { login, password },
      { onSuccess: () => navigate('/', { replace: true }) },
    );
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Firmowa tekstura: malutkie logo pod kątem, ledwo widoczne — jak w apce */}
      {logoUrl && (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -inset-1/2"
            style={{
              backgroundImage: `url(${logoUrl})`,
              backgroundRepeat: 'repeat',
              backgroundSize: '82px',
              transform: 'rotate(-24deg)',
              opacity: 0.04,
            }}
          />
        </div>
      )}

      <div
        className="animate-fade-in mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="mb-8 flex flex-col items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="BFTM"
              className="max-h-52 w-full animate-fade-in object-contain drop-shadow-sm"
            />
          ) : branding.isLoading ? (
            <div className="h-28 w-40 animate-pulse rounded-3xl bg-surface" />
          ) : null}
          {/* slogan stampowany wielkimi literami — jak druk na logo */}
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.3em] text-text-secondary">
            Auktoriserad företagsapp
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-(--radius-card) border border-line/60 bg-white/80 p-5 shadow-(--shadow-card) backdrop-blur"
        >
          <Input
            label="Användarnamn eller e-post"
            autoComplete="username"
            autoCapitalize="none"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <Input
            label="Lösenord"
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
            <span className="text-sm">Kom ihåg mig</span>
          </button>

          <button
            type="submit"
            disabled={signIn.isPending}
            className="press mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-(--radius-input) bg-gradient-to-b from-accent to-[#a30000] text-base font-semibold text-white shadow-lg shadow-accent/25 transition-transform disabled:opacity-70"
          >
            {signIn.isPending ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                Logga in
                <ArrowRight className="size-5" strokeWidth={2.2} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

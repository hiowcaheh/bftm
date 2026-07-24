import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/components/ui/Toast';
import { supabase, setRememberMe } from '@/lib/supabaseClient';
import { usePublicBranding, useSignIn } from '../hooks';

/**
 * Ekran logowania — wizytówka firmy, celowo po SZWEDZKU (jak strony publiczne):
 * punkt wejścia do autoryzowanej aplikacji BFTM. Logo + watermark z małych logo
 * w tle (jak w aplikacji), pola z ikonami, „login/e-mail" (literalne „admin"
 * mapuje się na e-mail administratora), bez rejestracji i resetu (robi to admin).
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
    signIn.mutate({ login, password }, { onSuccess: () => navigate('/', { replace: true }) });
  };

  const fieldClass =
    'h-12 w-full rounded-(--radius-input) border border-line bg-white pl-11 pr-3.5 text-[1rem] text-text placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15';

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
          {/* slogan stampowany wielkimi literami, w czerwieni logo */}
          <p className="text-center text-[13px] font-bold uppercase tracking-[0.28em] text-accent">
            Auktoriserad företagsapp
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-(--radius-card) border border-line/60 bg-white/80 p-5 shadow-(--shadow-card) backdrop-blur"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login" className="text-xs font-medium text-text-secondary">
              Användarnamn eller e-post
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-text-secondary/60" strokeWidth={1.8} />
              <input
                id="login"
                className={fieldClass}
                autoComplete="username"
                autoCapitalize="none"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-text-secondary">
              Lösenord
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-text-secondary/60" strokeWidth={1.8} />
              <input
                id="password"
                type="password"
                className={fieldClass}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* checkbox „zapamiętaj mnie" — etykieta z lewej, box z prawej */}
          <button
            type="button"
            onClick={() => setRemember((v) => !v)}
            className="flex w-full items-center justify-end gap-2 py-0.5"
          >
            <span className="text-xs font-medium text-text-secondary">Kom ihåg mig</span>
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                remember ? 'border-accent bg-accent text-white' : 'border-line bg-white',
              )}
            >
              {remember && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          </button>

          <button
            type="submit"
            disabled={signIn.isPending}
            className="press mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-white shadow-md shadow-accent/20 transition disabled:opacity-70"
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

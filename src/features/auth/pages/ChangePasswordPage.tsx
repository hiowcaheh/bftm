import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useChangePassword } from '../hooks';
import { useSession } from '../SessionProvider';

const schema = z
  .object({
    password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Hasła nie są identyczne',
    path: ['confirm'],
  });

/**
 * Wymuszona zmiana hasła — pokazywana zamiast aplikacji, dopóki
 * profil ma must_change_password=true. Nie da się jej ominąć.
 */
export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const changePassword = useChangePassword();
  const { user } = useSession();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as 'password' | 'confirm';
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    changePassword.mutate(parsed.data.password);
  };

  return (
    <div
      className="animate-fade-in mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft">
          <KeyRound className="size-8 text-accent" />
        </div>
        <h1 className="text-xl font-semibold">Ustaw nowe hasło</h1>
        <p className="text-sm text-text-secondary">
          {user?.email ? `Konto: ${user.email}. ` : ''}
          Ze względów bezpieczeństwa musisz zmienić hasło startowe, zanim przejdziesz dalej.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nowe hasło"
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Powtórz nowe hasło"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={changePassword.isPending}
          className="mt-2"
        >
          Zapisz nowe hasło
        </Button>
      </form>
    </div>
  );
}

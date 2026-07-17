import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useT } from '@/lib/i18n/context';
import { useChangePassword } from '../hooks';
import { useSession } from '../SessionProvider';

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
  const t = useT();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors: typeof errors = {};
    if (password.length < 6) fieldErrors.password = t('setc.pwTooShort');
    if (password !== confirm) fieldErrors.confirm = t('setc.pwMismatch');
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    changePassword.mutate(password);
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
        <h1 className="text-xl font-semibold">{t('setc.setNewPwTitle')}</h1>
        <p className="text-sm text-text-secondary">
          {user?.email ? t('setc.accountLabel', { email: user.email }) : ''}
          {t('setc.setNewPwDesc')}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('setc.newPw')}
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label={t('setc.repeatPw')}
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
          {t('setc.saveNewPw')}
        </Button>
      </form>
    </div>
  );
}

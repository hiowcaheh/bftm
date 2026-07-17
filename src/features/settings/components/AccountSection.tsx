import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { verifyCurrentPassword } from '@/features/auth/api';
import { useChangePassword } from '@/features/auth/hooks';
import { useSession } from '@/features/auth/SessionProvider';

/** Ustawienia → Moje konto: dobrowolna zmiana hasła (stare + nowe ×2). */
export function AccountSection() {
  const t = useT();
  const { user } = useSession();
  const changePassword = useChangePassword();
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [verifying, setVerifying] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors: typeof errors = {};
    if (!form.current) fieldErrors.current = t('setc.currentPwErr');
    if (form.password.length < 6) fieldErrors.password = t('setc.pwTooShort');
    if (form.password !== form.confirm) fieldErrors.confirm = t('setc.pwMismatch');
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    if (!user) return;

    setVerifying(true);
    const ok = await verifyCurrentPassword(user.email, form.current);
    setVerifying(false);
    if (!ok) {
      toast.error(t('setc.wrongCurrentPw'));
      return;
    }
    changePassword.mutate(form.password, {
      onSuccess: () => setForm({ current: '', password: '', confirm: '' }),
    });
  };

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-accent" strokeWidth={1.8} />
        <h2 className="text-base font-semibold">{t('setc.account')}</h2>
      </div>
      <p className="text-xs text-text-secondary">
        {t('setc.loggedAs', { name: user?.fullName ?? '', email: user?.email ?? '' })}
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <Input
          label={t('setc.currentPw')}
          type="password"
          autoComplete="current-password"
          value={form.current}
          error={errors.current}
          onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
        />
        <Input
          label={t('setc.newPw')}
          type="password"
          autoComplete="new-password"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <Input
          label={t('setc.repeatPw')}
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          error={errors.confirm}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
        />
        <Button
          type="submit"
          variant="secondary"
          fullWidth
          loading={verifying || changePassword.isPending}
        >
          {t('setc.changePw')}
        </Button>
      </form>
    </Card>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { verifyCurrentPassword } from '@/features/auth/api';
import { useChangePassword } from '@/features/auth/hooks';
import { useSession } from '@/features/auth/SessionProvider';

const schema = z
  .object({
    current: z.string().min(1, 'Podaj obecne hasło'),
    password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Hasła nie są identyczne',
    path: ['confirm'],
  });

/** Ustawienia → Moje konto: dobrowolna zmiana hasła (stare + nowe ×2). */
export function AccountSection() {
  const { user } = useSession();
  const changePassword = useChangePassword();
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [verifying, setVerifying] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof form;
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    if (!user) return;

    setVerifying(true);
    const ok = await verifyCurrentPassword(user.email, form.current);
    setVerifying(false);
    if (!ok) {
      toast.error('Obecne hasło jest nieprawidłowe');
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
        <h2 className="text-base font-semibold">Moje konto</h2>
      </div>
      <p className="text-xs text-text-secondary">
        Zalogowano jako {user?.fullName} ({user?.email})
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <Input
          label="Obecne hasło"
          type="password"
          autoComplete="current-password"
          value={form.current}
          error={errors.current}
          onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
        />
        <Input
          label="Nowe hasło"
          type="password"
          autoComplete="new-password"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <Input
          label="Powtórz nowe hasło"
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
          Zmień hasło
        </Button>
      </form>
    </Card>
  );
}

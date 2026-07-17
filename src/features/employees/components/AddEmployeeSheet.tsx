import { useState } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { useT } from '@/lib/i18n/context';
import { DEFAULT_EMPLOYEE_PERMISSIONS } from '@/lib/permissions';
import { useCreateEmployee } from '../hooks';
import { generateTempPassword } from '../types';
import { TempPasswordDialog } from './TempPasswordDialog';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

interface AddEmployeeSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddEmployeeSheet({ open, onClose }: AddEmployeeSheetProps) {
  const t = useT();
  const create = useCreateEmployee();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    personnummer: '',
    temp_password: generateTempPassword(),
    hourly_wage: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [created, setCreated] = useState<{ password: string; email: string } | null>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const reset = () => {
    setForm({
      full_name: '',
      email: '',
      phone: '',
      personnummer: '',
      temp_password: generateTempPassword(),
      hourly_wage: '',
    });
    setErrors({});
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors: typeof errors = {};
    if (form.full_name.trim().length < 3) fieldErrors.full_name = t('emp.fullNameErr');
    if (!EMAIL_RE.test(form.email.trim())) fieldErrors.email = t('emp.emailErr');
    if (form.temp_password.length < 6) fieldErrors.temp_password = t('emp.tempPwErr');
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const wage = form.hourly_wage.trim()
      ? Number(form.hourly_wage.replace(',', '.'))
      : null;
    if (wage !== null && (Number.isNaN(wage) || wage < 0)) {
      setErrors({ hourly_wage: t('emp.wageErr') });
      return;
    }
    create.mutate(
      {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        personnummer: form.personnummer,
        temp_password: form.temp_password,
        hourly_wage: wage,
        permissions: DEFAULT_EMPLOYEE_PERMISSIONS,
      },
      {
        onSuccess: () => {
          setCreated({ password: form.temp_password, email: form.email });
          reset();
        },
      },
    );
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={t('emp.newEmployee')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label={t('emp.fullName')}
            value={form.full_name}
            error={errors.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
          />
          <Input
            label={t('emp.emailField')}
            type="email"
            autoCapitalize="none"
            value={form.email}
            error={errors.email}
            onChange={(e) => set({ email: e.target.value })}
          />
          <Input
            label={t('emp.phoneOptional')}
            type="tel"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
          <Input
            label={t('cli.pnrOptional')}
            inputMode="numeric"
            placeholder="ÅÅÅÅMMDD-XXXX"
            hint={t('emp.pnrHint')}
            value={form.personnummer}
            onChange={(e) => set({ personnummer: e.target.value })}
          />
          <Input
            label={t('emp.wageField')}
            inputMode="decimal"
            value={form.hourly_wage}
            error={errors.hourly_wage}
            hint={t('emp.wageHint')}
            onChange={(e) => set({ hourly_wage: e.target.value })}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label={t('emp.tempPw')}
                value={form.temp_password}
                error={errors.temp_password}
                hint={t('emp.tempPwHint')}
                onChange={(e) => set({ temp_password: e.target.value })}
              />
            </div>
            <Button
              variant="secondary"
              icon={<RefreshCw className="size-4" />}
              aria-label={t('emp.genPw')}
              className="mb-6"
              onClick={() => set({ temp_password: generateTempPassword() })}
            />
          </div>
          <p className="text-xs text-text-secondary">{t('emp.defaultPermsNote')}</p>
          <Button type="submit" fullWidth size="lg" loading={create.isPending}>
            {t('emp.createAccount')}
          </Button>
        </form>
      </Sheet>
      <TempPasswordDialog
        open={created !== null}
        password={created?.password ?? ''}
        email={created?.email ?? ''}
        onClose={() => {
          setCreated(null);
          onClose();
        }}
      />
    </>
  );
}

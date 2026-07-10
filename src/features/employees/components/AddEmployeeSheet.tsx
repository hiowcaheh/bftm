import { useState } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { DEFAULT_EMPLOYEE_PERMISSIONS } from '@/lib/permissions';
import { useCreateEmployee } from '../hooks';
import { generateTempPassword } from '../types';
import { TempPasswordDialog } from './TempPasswordDialog';

const schema = z.object({
  full_name: z.string().min(3, 'Podaj imię i nazwisko'),
  email: z.string().email('Podaj prawidłowy adres e-mail'),
  phone: z.string(),
  personnummer: z.string(),
  temp_password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
  hourly_wage: z.string(),
});

interface AddEmployeeSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddEmployeeSheet({ open, onClose }: AddEmployeeSheetProps) {
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
    const wage = form.hourly_wage.trim()
      ? Number(form.hourly_wage.replace(',', '.'))
      : null;
    if (wage !== null && (Number.isNaN(wage) || wage < 0)) {
      setErrors({ hourly_wage: 'Podaj prawidłową stawkę (np. 250)' });
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
      <Sheet open={open} onClose={onClose} title="Nowy pracownik">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Imię i nazwisko"
            value={form.full_name}
            error={errors.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
          />
          <Input
            label="E-mail (login pracownika)"
            type="email"
            autoCapitalize="none"
            value={form.email}
            error={errors.email}
            onChange={(e) => set({ email: e.target.value })}
          />
          <Input
            label="Telefon (opcjonalnie)"
            type="tel"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
          <Input
            label="Personnummer (opcjonalnie)"
            inputMode="numeric"
            placeholder="ÅÅÅÅMMDD-XXXX"
            hint="Pracownik może go też sam uzupełnić w swoim profilu"
            value={form.personnummer}
            onChange={(e) => set({ personnummer: e.target.value })}
          />
          <Input
            label="Stawka godzinowa brutto w kr (opcjonalnie)"
            inputMode="decimal"
            value={form.hourly_wage}
            error={errors.hourly_wage}
            hint="Koszt firmy = stawka × narzuty; edytowalna później z historią"
            onChange={(e) => set({ hourly_wage: e.target.value })}
          />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Hasło tymczasowe"
                value={form.temp_password}
                error={errors.temp_password}
                hint="Pokażemy je jeszcze raz po utworzeniu konta"
                onChange={(e) => set({ temp_password: e.target.value })}
              />
            </div>
            <Button
              variant="secondary"
              icon={<RefreshCw className="size-4" />}
              aria-label="Wygeneruj nowe hasło"
              className="mb-6"
              onClick={() => set({ temp_password: generateTempPassword() })}
            />
          </div>
          <p className="text-xs text-text-secondary">
            Nowe konto dostaje domyślnie: własne godziny + podgląd projektów. Pozostałe
            uprawnienia włączysz w profilu pracownika. Przy pierwszym logowaniu system
            wymusi zmianę hasła.
          </p>
          <Button type="submit" fullWidth size="lg" loading={create.isPending}>
            Utwórz konto
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

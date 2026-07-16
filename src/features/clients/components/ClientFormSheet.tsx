import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { z } from 'zod';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { lookupCompanyByOrgnr } from '../api';
import { useCreateClient, useUpdateClient } from '../hooks';
import type { Client } from '../types';

const schema = z.object({
  name: z.string().min(2, 'Podaj nazwę klienta'),
  email: z.string().email('Nieprawidłowy e-mail').or(z.literal('')),
});

interface ClientFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** null = nowy klient */
  client: Client | null;
}

const empty = {
  name: '',
  type: 'company' as Client['type'],
  org_or_person_nr: '',
  email: '',
  phone: '',
  address: '',
  reverse_vat: false,
  rot_eligible: false,
  notes: '',
};

export function ClientFormSheet({ open, onClose, client }: ClientFormSheetProps) {
  const create = useCreateClient();
  const update = useUpdateClient(client?.id ?? '');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              name: client.name,
              type: client.type,
              org_or_person_nr: client.org_or_person_nr ?? '',
              email: client.email ?? '',
              phone: client.phone ?? '',
              address: client.address ?? '',
              reverse_vat: client.reverse_vat,
              rot_eligible: client.rot_eligible,
              notes: client.notes ?? '',
            }
          : empty,
      );
      setErrors({});
    }
  }, [open, client]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const fetchCompany = async () => {
    const nr = form.org_or_person_nr.trim();
    if (!nr) {
      toast.error('Wpisz organisationsnummer');
      return;
    }
    setLooking(true);
    try {
      const res = await lookupCompanyByOrgnr(nr);
      if (res.valid && res.name) {
        set({ name: res.name, address: res.address ?? form.address });
        toast.success('Dane firmy pobrane');
      } else {
        toast.info('Nie znaleziono firmy dla tego numeru');
      }
    } catch {
      toast.error('Nie udało się pobrać danych firmy');
    } finally {
      setLooking(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      org_or_person_nr: form.org_or_person_nr.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      reverse_vat: form.reverse_vat,
      rot_eligible: form.rot_eligible,
      notes: form.notes.trim() || null,
    };
    const mutation = client ? update : create;
    mutation.mutate(payload, { onSuccess: onClose });
  };

  return (
    <Sheet open={open} onClose={onClose} title={client ? 'Edytuj klienta' : 'Nowy klient'}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <SegmentedControl
          options={[
            { value: 'company', label: 'Firma' },
            { value: 'private', label: 'Klient prywatny' },
          ]}
          value={form.type}
          onChange={(type) =>
            set({
              type,
              // sensowne domyślne dla Szwecji: firma budowlana → omvänd moms,
              // klient prywatny → ROT
              reverse_vat: type === 'company' ? form.reverse_vat : false,
              rot_eligible: type === 'private' ? true : false,
            })
          }
        />
        <Input
          label={form.type === 'company' ? 'Nazwa firmy' : 'Imię i nazwisko'}
          value={form.name}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={form.type === 'company' ? 'Organisationsnummer' : 'Personnummer (opcjonalnie)'}
              value={form.org_or_person_nr}
              onChange={(e) => set({ org_or_person_nr: e.target.value })}
            />
          </div>
          {form.type === 'company' && (
            <button
              type="button"
              disabled={looking}
              aria-label="Pobierz dane firmy"
              onClick={() => void fetchCompany()}
              className="press flex h-12 shrink-0 items-center gap-1.5 rounded-(--radius-input) bg-accent px-3.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {looking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Pobierz
            </button>
          )}
        </div>
        <Input
          label="E-mail"
          type="email"
          autoCapitalize="none"
          hint="Użyjemy go do wysyłki ofert i wizualizacji"
          value={form.email}
          error={errors.email}
          onChange={(e) => set({ email: e.target.value })}
        />
        <Input
          label="Telefon"
          type="tel"
          value={form.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <Input
          label="Adres"
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
        />

        {form.type === 'company' && (
          <div className="flex min-h-12 items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">Omvänd byggmoms</p>
              <p className="text-xs text-text-secondary">
                Odwrotne obciążenie VAT dla usług budowlanych B2B
              </p>
            </div>
            <Switch
              checked={form.reverse_vat}
              onChange={(v) => set({ reverse_vat: v })}
              label="Omvänd byggmoms"
              hideLabel
            />
          </div>
        )}
        {form.type === 'private' && (
          <div className="flex min-h-12 items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">Uprawniony do ROT</p>
              <p className="text-xs text-text-secondary">
                Odliczenie 30% robocizny (limit 50 000 kr/os./rok)
              </p>
            </div>
            <Switch
              checked={form.rot_eligible}
              onChange={(v) => set({ rot_eligible: v })}
              label="ROT"
              hideLabel
            />
          </div>
        )}

        <Textarea
          label="Notatki (opcjonalnie)"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={create.isPending || update.isPending}
        >
          {client ? 'Zapisz zmiany' : 'Dodaj klienta'}
        </Button>
      </form>
    </Sheet>
  );
}

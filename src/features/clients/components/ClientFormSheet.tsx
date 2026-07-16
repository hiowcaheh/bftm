import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { useT } from '@/lib/i18n/context';
import { lookupCompanyByOrgnr } from '../api';
import { useCreateClient, useUpdateClient } from '../hooks';
import type { Client } from '../types';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

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
  const t = useT();
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
      toast.error(t('cli.orgnrErr'));
      return;
    }
    setLooking(true);
    try {
      const res = await lookupCompanyByOrgnr(nr);
      if (res.valid && res.name) {
        set({ name: res.name, address: res.address ?? form.address });
        toast.success(t('cli.companyFetched'));
      } else {
        toast.info(t('cli.companyNotFound'));
      }
    } catch {
      toast.error(t('cli.companyFetchErr'));
    } finally {
      setLooking(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors: typeof errors = {};
    if (form.name.trim().length < 2) fieldErrors.name = t('cli.nameErr');
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      fieldErrors.email = t('cli.emailErr');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
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
    <Sheet open={open} onClose={onClose} title={client ? t('cli.editClient') : t('cli.newClient')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <SegmentedControl
          options={[
            { value: 'company', label: t('cli.company') },
            { value: 'private', label: t('cli.privateClient') },
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
          label={form.type === 'company' ? t('cli.companyName') : t('cli.personName')}
          value={form.name}
          error={errors.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label={form.type === 'company' ? 'Organisationsnummer' : t('cli.pnrOptional')}
              value={form.org_or_person_nr}
              onChange={(e) => set({ org_or_person_nr: e.target.value })}
            />
          </div>
          {form.type === 'company' && (
            <button
              type="button"
              disabled={looking}
              aria-label={t('cli.fetchCompany')}
              onClick={() => void fetchCompany()}
              className="press flex h-12 shrink-0 items-center gap-1.5 rounded-(--radius-input) bg-accent px-3.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {looking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t('cli.fetchBtn')}
            </button>
          )}
        </div>
        <Input
          label="E-mail"
          type="email"
          autoCapitalize="none"
          hint={t('cli.emailHint')}
          value={form.email}
          error={errors.email}
          onChange={(e) => set({ email: e.target.value })}
        />
        <Input
          label={t('cli.phone')}
          type="tel"
          value={form.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <Input
          label={t('cli.address')}
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
        />

        {form.type === 'company' && (
          <div className="flex min-h-12 items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">Omvänd byggmoms</p>
              <p className="text-xs text-text-secondary">
                {t('cli.reverseVatDesc')}
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
              <p className="text-sm font-medium">{t('cli.rotTitle')}</p>
              <p className="text-xs text-text-secondary">
                {t('cli.rotDesc')}
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
          label={t('cli.notesOptional')}
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={create.isPending || update.isPending}
        >
          {client ? t('ts.saveChanges') : t('cli.addClient')}
        </Button>
      </form>
    </Sheet>
  );
}

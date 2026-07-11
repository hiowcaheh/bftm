import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, ImageUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { ICON_KEYS, iconByKey } from '@/lib/iconRegistry';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePublicBranding } from '@/features/auth/hooks';
import { logoPublicUrl } from '../api';
import { useCompanyDetails, useSaveCompany, useUploadLogo } from '../hooks';
import { EMPTY_COMPANY_DETAILS, type CompanyDetails } from '../types';

/** Ustawienia → Firma: dane do PDF-ów, branding i logo (tylko admin). */
export function CompanySection() {
  const details = useCompanyDetails(true);
  const save = useSaveCompany();
  const uploadLogo = useUploadLogo();
  const branding = usePublicBranding();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CompanyDetails>(EMPTY_COMPANY_DETAILS);
  const [slogan, setSlogan] = useState('');
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  useEffect(() => {
    if (details.data) setForm(details.data);
  }, [details.data]);
  useEffect(() => {
    if (branding.data) setSlogan(branding.data.slogan);
  }, [branding.data]);

  const set = (patch: Partial<CompanyDetails>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const contacts = form.contacts.filter((c) => c.name.trim() || c.phone.trim());
    const services = form.services.filter((sv) => sv.name.trim());
    save.mutate({ details: { ...form, contacts, services }, slogan });
  };

  if (details.isLoading) {
    return <Skeleton className="h-64 w-full rounded-(--radius-card)" />;
  }

  const logoPath = branding.data?.logoPath ?? null;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Building2 className="size-5 text-accent" strokeWidth={1.8} />
        <h2 className="text-base font-semibold">Firma</h2>
      </div>

      <div className="flex items-center gap-4">
        {logoPath ? (
          <img
            src={logoPublicUrl(logoPath)}
            alt="Logo firmy"
            className="size-16 rounded-2xl border border-line object-contain"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-2xl bg-surface text-xs text-text-secondary">
            brak logo
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          icon={<ImageUp className="size-4" />}
          loading={uploadLogo.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {logoPath ? 'Zmień logo' : 'Dodaj logo'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadLogo.mutate(file);
            e.target.value = '';
          }}
        />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nazwa firmy"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <Input
          label="Slogan (na ekranie logowania)"
          value={slogan}
          onChange={(e) => setSlogan(e.target.value)}
        />
        <Input
          label="Adres"
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Organisationsnummer"
            value={form.org_nr}
            onChange={(e) => set({ org_nr: e.target.value })}
          />
          <Input
            label="VAT-nr (SE…01)"
            value={form.vat_nr}
            onChange={(e) => set({ vat_nr: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Bankgiro"
            value={form.bankgiro}
            onChange={(e) => set({ bankgiro: e.target.value })}
          />
          <Input
            label="Plusgiro"
            value={form.plusgiro}
            onChange={(e) => set({ plusgiro: e.target.value })}
          />
        </div>
        <Input label="IBAN" value={form.iban} onChange={(e) => set({ iban: e.target.value })} />
        {[0, 1].map((i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <Input
              label={`Kontakt ${i + 1} — imię`}
              placeholder={i === 0 ? 'np. Tomasz' : 'np. Mateusz'}
              value={form.contacts[i]?.name ?? ''}
              onChange={(e) => {
                const contacts = [...form.contacts];
                contacts[i] = { name: e.target.value, phone: contacts[i]?.phone ?? '' };
                set({ contacts });
              }}
            />
            <Input
              label="Telefon"
              type="tel"
              value={form.contacts[i]?.phone ?? ''}
              onChange={(e) => {
                const contacts = [...form.contacts];
                contacts[i] = { name: contacts[i]?.name ?? '', phone: e.target.value };
                set({ contacts });
              }}
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Telefon"
            type="tel"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </div>
        <Textarea
          label="O firmie (na stronie oferty, po szwedzku)"
          rows={4}
          value={form.about}
          onChange={(e) => set({ about: e.target.value })}
          hint={'Ten tekst klient czyta w sekcji „Om oss" na stronie oferty'}
        />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-text-secondary">
            Usługi na stronie oferty (nazwa + ikonka)
          </p>
          {form.services.map((service, i) => {
            const Icon = iconByKey(service.icon);
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Wybierz ikonkę"
                  className="press flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface"
                  onClick={() => setIconPickerIndex(i)}
                >
                  <Icon className="size-5 text-accent" />
                </button>
                <input
                  value={service.name}
                  placeholder="np. Fasad & puts"
                  className="h-11 min-w-0 flex-1 rounded-(--radius-input) border border-line bg-white px-3 text-[1rem] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  onChange={(e) => {
                    const services = [...form.services];
                    services[i] = { ...services[i]!, name: e.target.value };
                    set({ services });
                  }}
                />
                <button
                  type="button"
                  aria-label="Usuń usługę"
                  className="press flex size-11 shrink-0 items-center justify-center rounded-xl bg-error-soft text-error"
                  onClick={() => set({ services: form.services.filter((_, x) => x !== i) })}
                >
                  <Trash2 className="size-4.5" />
                </button>
              </div>
            );
          })}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() =>
              set({ services: [...form.services, { name: '', icon: 'Hammer' }] })
            }
          >
            Dodaj usługę
          </Button>
        </div>
        <label className="flex min-h-12 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.f_skatt}
            onChange={(e) => set({ f_skatt: e.target.checked })}
            className="size-5 accent-(--color-accent)"
          />
          Godkänd för F-skatt (adnotacja na PDF)
        </label>
        <Button type="submit" fullWidth loading={save.isPending}>
          Zapisz dane firmy
        </Button>
      </form>

      <Sheet
        open={iconPickerIndex !== null}
        onClose={() => setIconPickerIndex(null)}
        title="Wybierz ikonkę"
      >
        <div className="grid grid-cols-6 gap-2">
          {ICON_KEYS.map((key) => {
            const Icon = iconByKey(key);
            const active =
              iconPickerIndex !== null && form.services[iconPickerIndex]?.icon === key;
            return (
              <button
                key={key}
                type="button"
                aria-label={key}
                className={
                  'press flex aspect-square items-center justify-center rounded-xl ' +
                  (active ? 'bg-accent text-white' : 'bg-surface text-text')
                }
                onClick={() => {
                  if (iconPickerIndex !== null) {
                    const services = [...form.services];
                    const current = services[iconPickerIndex];
                    if (current) {
                      services[iconPickerIndex] = { ...current, icon: key };
                      set({ services });
                    }
                  }
                  setIconPickerIndex(null);
                }}
              >
                <Icon className="size-5" />
              </button>
            );
          })}
        </div>
      </Sheet>
    </Card>
  );
}

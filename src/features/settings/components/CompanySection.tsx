import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, ImageUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';
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
  useEffect(() => {
    if (details.data) setForm(details.data);
  }, [details.data]);
  useEffect(() => {
    if (branding.data) setSlogan(branding.data.slogan);
  }, [branding.data]);

  const set = (patch: Partial<CompanyDetails>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate({ details: form, slogan });
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
        <Input
          label="Usługi (rozdzielone przecinkami)"
          value={form.services.join(', ')}
          onChange={(e) =>
            set({
              services: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          hint="Pokazywane z ikonkami na stronie oferty, np. Fasad & puts, Takarbeten"
        />
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
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import {
  ArrowLeft,
  Copy,
  Eye,
  Link2,
  Mail,
  Pencil,
  Plus,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { DateField } from '@/components/ui/DateField';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { toast } from '@/components/ui/Toast';
import { date as fmtDate, money, num } from '@/lib/format';
import type { Json } from '@/types/database';
import { useSession } from '@/features/auth/SessionProvider';
import { useClients } from '@/features/clients/hooks';
import { useFinanceSettings } from '@/features/settings/hooks';
import { offerPublicUrl } from '../api';
import { useDeleteOffer, useOffer, usePublishOffer, useSaveOffer } from '../hooks';
import {
  computeOfferTotals,
  OFFER_STATUS_LABELS,
  OFFER_STATUS_TONES,
  type OfferItem,
} from '../types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const VAT_RATES = [25, 12, 6, 0];
const UNITS = ['tim', 'st', 'm²', 'm', 'lpm', 'kpl'];

interface DraftItem {
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  is_labor: boolean;
}

const EMPTY_ITEM: DraftItem = {
  description: '',
  unit: 'tim',
  quantity: 1,
  unit_price: 0,
  vat_rate: 25,
  is_labor: false,
};

/** Kreator oferty: klient, pozycje, ROT/omvänd byggmoms, publikacja z linkiem. */
export default function OfferEditorPage() {
  const { id: routeId = '' } = useParams();
  const isNew = routeId === 'nowa';
  const offerId = isNew ? null : routeId;
  const navigate = useNavigate();
  const { can } = useSession();
  const canEdit = can('offers_edit');

  const existing = useOffer(offerId);
  const clients = useClients();
  const finance = useFinanceSettings(true);
  const save = useSaveOffer();
  const publish = usePublishOffer();
  const remove = useDeleteOffer();

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [validUntil, setValidUntil] = useState(iso(addDays(new Date(), 30)));
  const [rotEnabled, setRotEnabled] = useState(false);
  const [rotPersons, setRotPersons] = useState('1');
  const [reverseVat, setReverseVat] = useState(false);
  const [notes, setNotes] = useState('');
  const [guarantee, setGuarantee] = useState('');
  const [ataInfo, setAtaInfo] = useState('');
  const [travelInfo, setTravelInfo] = useState('');
  const [paymentDays, setPaymentDays] = useState('30');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [itemSheet, setItemSheet] = useState<{ index: number | null } | null>(null);
  const [draftItem, setDraftItem] = useState<DraftItem>(EMPTY_ITEM);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existing.data && !loaded) {
      const { offer, items: rows } = existing.data;
      setTitle(offer.title ?? '');
      setClientId(offer.client_id ?? '');
      setValidUntil(offer.valid_until ?? iso(addDays(new Date(), 30)));
      setRotEnabled(offer.rot_enabled);
      setRotPersons(String(offer.rot_persons));
      setReverseVat(offer.reverse_vat);
      setNotes(offer.notes ?? '');
      setGuarantee(offer.guarantee ?? '');
      setAtaInfo(offer.ata_info ?? '');
      setTravelInfo(offer.travel_info ?? '');
      setPaymentDays(offer.payment_days != null ? String(offer.payment_days) : '30');
      setItems(
        rows.map((r: OfferItem) => ({
          description: r.description,
          unit: r.unit,
          quantity: r.quantity,
          unit_price: r.unit_price,
          vat_rate: r.vat_rate,
          is_labor: r.is_labor,
        })),
      );
      setLoaded(true);
    }
  }, [existing.data, loaded]);

  const offer = existing.data?.offer ?? null;
  const status = offer?.status ?? 'draft';
  const client = (clients.data ?? []).find((c) => c.id === clientId) ?? null;

  // Nowy klient w szkicu → podpowiedz ROT / omvänd byggmoms z jego karty
  const onClientChange = (nextId: string) => {
    setClientId(nextId);
    const c = (clients.data ?? []).find((x) => x.id === nextId);
    if (c && status === 'draft') {
      setReverseVat(c.reverse_vat);
      setRotEnabled(c.rot_eligible && !c.reverse_vat);
    }
  };

  const totals = useMemo(
    () =>
      computeOfferTotals(items, {
        reverseVat,
        rotEnabled,
        rotPersons: Number(rotPersons) || 1,
        rotPct: finance.data?.rot.pct ?? 30,
        rotCap: finance.data?.rot.cap_per_person ?? 50000,
      }),
    [items, reverseVat, rotEnabled, rotPersons, finance.data],
  );

  const snapshot = (): Json | null =>
    client
      ? ({
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          org_or_person_nr: client.org_or_person_nr,
        } as Json)
      : null;

  const payload = () => ({
    title: title.trim() || null,
    client_id: clientId || null,
    valid_until: validUntil || null,
    rot_enabled: rotEnabled,
    rot_persons: Number(rotPersons) || 1,
    reverse_vat: reverseVat,
    notes: notes.trim() || null,
    guarantee: guarantee.trim() || null,
    ata_info: ataInfo.trim() || null,
    travel_info: travelInfo.trim() || null,
    payment_days: Number(paymentDays) || null,
  });

  const validate = (): boolean => {
    if (!title.trim()) {
      toast.error('Nadaj ofercie tytuł (np. „Takarbete — Brf Lilla Malmtorp")');
      return false;
    }
    if (items.length === 0) {
      toast.error('Dodaj przynajmniej jedną pozycję');
      return false;
    }
    return true;
  };

  const saveDraft = () => {
    if (!validate()) return;
    save.mutate(
      { id: offerId, offer: payload(), items },
      {
        onSuccess: (newId) => {
          toast.success('Oferta zapisana');
          if (isNew) navigate(`/oferty/${newId}`, { replace: true });
        },
      },
    );
  };

  const shareOffer = () => {
    if (!validate()) return;
    save.mutate(
      { id: offerId, offer: payload(), items },
      {
        onSuccess: (savedId) => {
          publish.mutate(
            { id: savedId, snapshot: snapshot() },
            {
              onSuccess: (token) => {
                setShareUrl(offerPublicUrl(token));
                setShareOpen(true);
                if (isNew) navigate(`/oferty/${savedId}`, { replace: true });
              },
            },
          );
        },
      },
    );
  };

  const mailBody = () => {
    const clientName = client?.name ?? 'kund';
    return (
      `Hej ${clientName}!\n\n` +
      `Tack för visat intresse för våra tjänster. Vi har förberett en detaljerad offert för ditt projekt: ${title.trim()}.\n\n` +
      `Du kan ta del av hela offerten via länken nedan:\n${shareUrl}\n\n` +
      (validUntil ? `Observera att denna offert är giltig fram till: ${fmtDate(validUntil)}\n\n` : '') +
      `Med vänliga hälsningar,\nBFTM Fasad & Bygg AB`
    );
  };

  if (offerId && existing.isLoading) return <SkeletonList rows={6} />;
  if (offerId && !existing.isLoading && !existing.data) {
    return (
      <p className="py-16 text-center text-sm text-text-secondary">
        Nie znaleziono oferty.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/oferty')}
          className="press flex items-center gap-1 text-sm font-medium text-text-secondary"
        >
          <ArrowLeft className="size-4" /> Oferty
        </button>
        <div className="flex items-center gap-2">
          {offer && <span className="text-xs text-text-secondary">{offer.number}</span>}
          <Badge tone={OFFER_STATUS_TONES[status]}>{OFFER_STATUS_LABELS[status]}</Badge>
        </div>
      </div>

      {offer?.viewed_at && (
        <p className="rounded-xl bg-info-soft px-3 py-2 text-xs text-info">
          Otwarta przez klienta {offer.view_count}{' '}
          {offer.view_count === 1 ? 'raz' : 'razy'} (pierwszy raz{' '}
          {fmtDate(offer.viewed_at)})
          {offer.response_comment ? ` • komentarz: „${offer.response_comment}"` : ''}
        </p>
      )}

      <Card className="flex flex-col gap-4 p-4">
        <Input
          label="Tytuł oferty"
          placeholder="np. Takarbete — Brf Lilla Malmtorp"
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select
          label="Klient"
          value={clientId}
          disabled={!canEdit}
          options={[
            { value: '', label: 'Wybierz klienta…' },
            ...(clients.data ?? []).map((c) => ({ value: c.id, label: c.name })),
          ]}
          onChange={(e) => onClientChange(e.target.value)}
        />
        <DateField
          label="Ważna do"
          value={validUntil}
          disabled={!canEdit}
          onChange={(e) => setValidUntil(e.target.value)}
        />
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Pozycje</h2>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => {
                setDraftItem(EMPTY_ITEM);
                setItemSheet({ index: null });
              }}
            >
              Dodaj
            </Button>
          )}
        </div>

        {items.length === 0 && (
          <p className="text-sm text-text-secondary">Brak pozycji</p>
        )}

        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            disabled={!canEdit}
            className="press flex items-center gap-3 rounded-xl bg-surface p-3 text-left"
            onClick={() => {
              setDraftItem(item);
              setItemSheet({ index: i });
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.description}</p>
              <p className="tabular-nums mt-0.5 text-xs text-text-secondary">
                {num(item.quantity)} {item.unit ?? ''} × {money(item.unit_price)} • moms{' '}
                {num(item.vat_rate)}%{item.is_labor ? ' • robocizna (ROT)' : ''}
              </p>
            </div>
            <span className="tabular-nums shrink-0 text-sm font-semibold">
              {money(item.quantity * item.unit_price)}
            </span>
            {canEdit && <Pencil className="size-4 shrink-0 text-text-secondary" />}
          </button>
        ))}
      </Card>

      <Card className="flex flex-col gap-3 p-4">
        <h2 className="text-base font-semibold">Podatki i odliczenia</h2>
        <Switch
          checked={reverseVat}
          disabled={!canEdit}
          onChange={(v) => {
            setReverseVat(v);
            if (v) setRotEnabled(false);
          }}
          label="Omvänd byggmoms"
          description="Klient jest firmą budowlaną — moms rozlicza nabywca, oferta bez VAT i bez ROT"
        />
        <Switch
          checked={rotEnabled}
          disabled={!canEdit || reverseVat}
          onChange={setRotEnabled}
          label="Odliczenie ROT"
          description="Klient prywatny — od sumy odejmujemy 30% kosztów robocizny"
        />
        {rotEnabled && (
          <Input
            label="Liczba osób z prawem do ROT"
            inputMode="numeric"
            value={rotPersons}
            disabled={!canEdit}
            onChange={(e) => setRotPersons(e.target.value)}
            hint={`Limit ${money((finance.data?.rot.cap_per_person ?? 50000) * (Number(rotPersons) || 1))} (${num(finance.data?.rot.pct ?? 30)}% robocizny brutto)`}
          />
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-4">
        <h2 className="text-base font-semibold">Informacje dla klienta</h2>
        <Input
          label="Gwarancja (garanti)"
          placeholder="np. 5 års garanti på utfört arbete"
          value={guarantee}
          disabled={!canEdit}
          onChange={(e) => setGuarantee(e.target.value)}
        />
        <Input
          label="Prace dodatkowe (ÄTA-arbeten)"
          placeholder="np. ÄTA-arbeten debiteras 550 kr/tim efter godkännande"
          value={ataInfo}
          disabled={!canEdit}
          onChange={(e) => setAtaInfo(e.target.value)}
        />
        <Input
          label="Dojazd (reseräkning)"
          placeholder="np. Reseräkning 350 kr per dag"
          value={travelInfo}
          disabled={!canEdit}
          onChange={(e) => setTravelInfo(e.target.value)}
        />
        <Input
          label="Termin płatności (dni)"
          inputMode="numeric"
          value={paymentDays}
          disabled={!canEdit}
          onChange={(e) => setPaymentDays(e.target.value)}
          hint={'Klient zobaczy „Betalningsvillkor: X dagar"'}
        />
        <Textarea
          label="Komentarze dla klienta (opcjonalnie)"
          placeholder="np. zakres prac, terminy rozpoczęcia, ustalenia z rozmowy"
          value={notes}
          disabled={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Card>

      <Card className="tabular-nums flex flex-col gap-1 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Netto</span>
          <span>{money(totals.net)}</span>
        </div>
        {totals.vatByRate.map((v) => (
          <div key={v.rate} className="flex justify-between">
            <span className="text-text-secondary">Moms {num(v.rate)}%</span>
            <span>{money(v.amount)}</span>
          </div>
        ))}
        {reverseVat && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Moms</span>
            <span>omvänd byggmoms</span>
          </div>
        )}
        {totals.rotDeduction > 0 && (
          <div className="flex justify-between text-success">
            <span>ROT-avdrag</span>
            <span>−{money(totals.rotDeduction)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-line pt-1 text-base font-semibold">
          <span>Do zapłaty</span>
          <span>{money(totals.toPay)}</span>
        </div>
      </Card>

      {canEdit && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              loading={save.isPending && !publish.isPending}
              onClick={saveDraft}
            >
              Zapisz
            </Button>
            <Button
              icon={<Send className="size-5" />}
              loading={publish.isPending}
              onClick={() => {
                if (offer?.public_token) {
                  setShareUrl(offerPublicUrl(offer.public_token));
                  setShareOpen(true);
                } else {
                  shareOffer();
                }
              }}
            >
              {status === 'draft' ? 'Wyślij klientowi' : 'Udostępnij'}
            </Button>
          </div>
          {offer?.public_token && (
            <Button
              variant="secondary"
              fullWidth
              icon={<Eye className="size-5" />}
              onClick={() => window.open(offerPublicUrl(offer.public_token!, true), '_blank')}
            >
              Podgląd oferty klienta
            </Button>
          )}
          {offerId && (
            <Button
              variant="destructive"
              fullWidth
              icon={<Trash2 className="size-5" />}
              onClick={() => setConfirmDelete(true)}
            >
              Usuń ofertę
            </Button>
          )}
        </div>
      )}

      {/* Formularz pozycji */}
      <Sheet
        open={itemSheet !== null}
        onClose={() => setItemSheet(null)}
        title={itemSheet?.index != null ? 'Edytuj pozycję' : 'Nowa pozycja'}
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Opis"
            placeholder="np. Byte av takpannor inkl. underlagspapp"
            value={draftItem.description}
            onChange={(e) => setDraftItem({ ...draftItem, description: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Ilość"
              inputMode="decimal"
              value={String(draftItem.quantity)}
              onChange={(e) =>
                setDraftItem({
                  ...draftItem,
                  quantity: Number(e.target.value.replace(',', '.')) || 0,
                })
              }
            />
            <Select
              label="Jedn."
              value={draftItem.unit ?? ''}
              options={UNITS.map((u) => ({ value: u, label: u }))}
              onChange={(e) => setDraftItem({ ...draftItem, unit: e.target.value })}
            />
            <Input
              label="Cena netto"
              inputMode="decimal"
              value={String(draftItem.unit_price)}
              onChange={(e) =>
                setDraftItem({
                  ...draftItem,
                  unit_price: Number(e.target.value.replace(',', '.')) || 0,
                })
              }
            />
          </div>
          <Select
            label="Stawka moms"
            value={String(draftItem.vat_rate)}
            options={VAT_RATES.map((r) => ({ value: String(r), label: `${r}%` }))}
            onChange={(e) => setDraftItem({ ...draftItem, vat_rate: Number(e.target.value) })}
          />
          <Switch
            checked={draftItem.is_labor}
            onChange={(v) => setDraftItem({ ...draftItem, is_labor: v })}
            label="To jest robocizna"
            description="Włącz przy pozycjach za pracę — tylko od nich liczy się odliczenie ROT (materiały zostawiasz wyłączone)"
          />
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              if (draftItem.description.trim().length < 2) {
                toast.error('Opisz pozycję');
                return;
              }
              setItems((prev) => {
                if (itemSheet?.index != null) {
                  const next = [...prev];
                  next[itemSheet.index] = draftItem;
                  return next;
                }
                return [...prev, draftItem];
              });
              setItemSheet(null);
            }}
          >
            {itemSheet?.index != null ? 'Zapisz pozycję' : 'Dodaj pozycję'}
          </Button>
          {itemSheet?.index != null && (
            <Button
              variant="destructive"
              fullWidth
              icon={<Trash2 className="size-5" />}
              onClick={() => {
                setItems((prev) => prev.filter((_, i) => i !== itemSheet.index));
                setItemSheet(null);
              }}
            >
              Usuń pozycję
            </Button>
          )}
        </div>
      </Sheet>

      {/* Udostępnianie */}
      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Wyślij ofertę">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Klient zobaczy ofertę pod tym linkiem — bez logowania, z logo firmy
            i przyciskiem akceptacji:
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
            <Link2 className="size-4 shrink-0 text-text-secondary" />
            <span className="min-w-0 flex-1 truncate text-xs">{shareUrl}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              icon={<Copy className="size-5" />}
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
                toast.success('Link skopiowany');
              }}
            >
              Kopiuj link
            </Button>
            <Button
              variant="secondary"
              icon={<Share2 className="size-5" />}
              onClick={() => {
                if (navigator.share) {
                  void navigator.share({ title: `Offert — ${title}`, url: shareUrl });
                } else {
                  void navigator.clipboard.writeText(shareUrl);
                  toast.success('Link skopiowany');
                }
              }}
            >
              Udostępnij
            </Button>
          </div>
          <Button
            fullWidth
            icon={<Mail className="size-5" />}
            onClick={() => {
              const to = client?.email ?? '';
              window.location.href =
                `mailto:${to}?subject=${encodeURIComponent(`Offert ${offer?.number ?? ''} — ${title.trim()}`)}` +
                `&body=${encodeURIComponent(mailBody())}`;
            }}
          >
            Wyślij e-mailem
          </Button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Usunąć ofertę?"
        description={`Oferta ${offer?.number ?? ''} zostanie trwale usunięta — link klienta przestanie działać.`}
        confirmLabel="Usuń"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (offerId) {
            remove.mutate(offerId, {
              onSuccess: () => navigate('/oferty', { replace: true }),
            });
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

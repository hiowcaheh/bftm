import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileQuestion, Globe, Mail, Phone, XCircle } from 'lucide-react';
import { money, num } from '@/lib/format';
import { format } from 'date-fns';
import { logoPublicUrl } from '@/features/settings/api';
import { usePublicOffer, useRespondToOffer } from '../hooks';
import { computeOfferTotals } from '../types';

const NAVY = '#26324B';
const fmt = (d: string) => format(new Date(d), 'dd/MM/yyyy');

/**
 * Publiczna strona oferty (link z tokenem) — po SZWEDZKU, bez logowania.
 * Wygląd 1:1 z firmowym mailem: granatowy nagłówek z logo, czerwony pasek
 * „Offert för:", pozycje, sumy z moms/ROT, akceptacja, kontakt, stopka.
 */
export default function PublicOfferPage() {
  const { token = '' } = useParams();
  const offer = usePublicOffer(token);
  const respond = useRespondToOffer(token);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const data = offer.data;

  const totals = useMemo(
    () =>
      data
        ? computeOfferTotals(data.items, {
            reverseVat: data.reverse_vat,
            rotEnabled: data.rot_enabled,
            rotPersons: data.rot_persons,
            rotPct: data.rot.pct ?? 30,
            rotCap: data.rot.cap_per_person ?? 50000,
          })
        : null,
    [data],
  );

  if (offer.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F2F2F5]">
        <p className="text-sm text-text-secondary">Laddar offert…</p>
      </div>
    );
  }

  if (!data || !totals) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#F2F2F5] p-6 text-center">
        <FileQuestion className="size-10 text-text-secondary" />
        <p className="text-sm text-text-secondary">
          Offerten hittades inte eller är inte längre tillgänglig.
        </p>
      </div>
    );
  }

  const companyName = data.company.name || data.branding.name || 'BFTM Fasad & Bygg AB';
  const expired =
    data.status === 'sent' && data.valid_until && data.valid_until < format(new Date(), 'yyyy-MM-dd');
  const canRespond = data.status === 'sent';

  const doRespond = (accept: boolean) => {
    setError('');
    respond.mutate(
      { accept, comment },
      {
        onSuccess: () => setDeclineOpen(false),
        onError: () => setError('Något gick fel — försök igen eller kontakta oss.'),
      },
    );
  };

  return (
    <div className="min-h-dvh bg-[#F2F2F5] py-6 max-sm:py-0">
      <div className="mx-auto max-w-2xl overflow-hidden bg-white shadow-(--shadow-card) sm:rounded-2xl">
        {/* Nagłówek — granat + logo */}
        <div
          className="flex flex-col items-center gap-3 px-6 py-10"
          style={{ backgroundColor: NAVY }}
        >
          {data.branding.logo_path ? (
            <img
              src={logoPublicUrl(data.branding.logo_path)}
              alt={companyName}
              className="max-h-28 max-w-60 object-contain"
            />
          ) : (
            <p className="text-xl font-bold text-white">{companyName}</p>
          )}
          {data.branding.slogan && (
            <p className="text-xs font-medium tracking-[0.25em] text-[#E85D5D] uppercase">
              {data.branding.slogan}
            </p>
          )}
        </div>
        <div className="bg-accent px-4 py-3 text-center">
          <p className="text-base font-bold text-white">
            Offert för: {data.title ?? data.number}
          </p>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Status */}
          {data.status === 'accepted' && (
            <div className="flex items-center gap-3 rounded-xl bg-success-soft p-4 text-success">
              <CheckCircle2 className="size-6 shrink-0" />
              <p className="text-sm font-semibold">
                Offerten är accepterad{data.responded_at ? ` ${fmt(data.responded_at)}` : ''}.
                Tack! Vi hör av oss inom kort.
              </p>
            </div>
          )}
          {data.status === 'rejected' && (
            <div className="flex items-center gap-3 rounded-xl bg-surface p-4 text-text-secondary">
              <XCircle className="size-6 shrink-0" />
              <p className="text-sm font-semibold">Offerten har avböjts.</p>
            </div>
          )}

          {/* Powitanie */}
          {data.client.name && (
            <p className="text-base">
              Hej <b>{data.client.name}</b>!
            </p>
          )}
          <p className="text-sm text-text-secondary">
            Tack för visat intresse för våra tjänster. Nedan hittar du en detaljerad
            offert för ditt projekt. Kontakta oss gärna om du har några frågor.
          </p>

          {/* Szczegóły */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface p-4 text-center max-sm:grid-cols-1 max-sm:text-left">
            <div>
              <p className="text-[11px] text-text-secondary uppercase">Offertnummer</p>
              <p className="text-sm font-semibold">{data.number}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-secondary uppercase">Datum</p>
              <p className="text-sm font-semibold">
                {data.issue_date ? fmt(data.issue_date) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-text-secondary uppercase">Giltig till</p>
              <p className="text-sm font-semibold">
                {data.valid_until ? fmt(data.valid_until) : '—'}
              </p>
            </div>
          </div>

          {/* Pozycje */}
          <div>
            <h2 className="mb-2 text-base font-semibold">Specifikation</h2>
            <div className="flex flex-col divide-y divide-line rounded-xl border border-line">
              {data.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{item.description}</p>
                    <p className="tabular-nums mt-0.5 text-xs text-text-secondary">
                      {num(item.quantity)} {item.unit ?? ''} × {money(item.unit_price)}
                      {!data.reverse_vat ? ` • moms ${num(item.vat_rate)}%` : ''}
                    </p>
                  </div>
                  <span className="tabular-nums shrink-0 text-sm font-semibold">
                    {money(item.quantity * item.unit_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sumy */}
          <div className="tabular-nums flex flex-col gap-1 rounded-xl bg-surface p-4 text-sm">
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
            {data.reverse_vat && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Moms</span>
                <span>Omvänd skattskyldighet</span>
              </div>
            )}
            {totals.rotDeduction > 0 && (
              <div className="flex justify-between text-success">
                <span>ROT-avdrag ({num(data.rot.pct ?? 30)}% på arbetskostnad)</span>
                <span>−{money(totals.rotDeduction)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-bold">
              <span>Att betala</span>
              <span>{money(totals.toPay)}</span>
            </div>
            {totals.rotDeduction > 0 && (
              <p className="mt-1 text-[11px] text-text-secondary">
                ROT-avdraget förutsätter att du har tillräckligt avdragsutrymme hos
                Skatteverket ({data.rot_persons}{' '}
                {data.rot_persons === 1 ? 'person' : 'personer'}).
              </p>
            )}
            {data.reverse_vat && (
              <p className="mt-1 text-[11px] text-text-secondary">
                Omvänd byggmoms tillämpas — köparen redovisar momsen.
              </p>
            )}
          </div>

          {/* Uwagi */}
          {data.notes && (
            <div>
              <h2 className="mb-1 text-base font-semibold">Övrig information</h2>
              <p className="text-sm whitespace-pre-line text-text-secondary">{data.notes}</p>
            </div>
          )}
          {data.terms && (
            <div>
              <h2 className="mb-1 text-base font-semibold">Villkor</h2>
              <p className="text-sm whitespace-pre-line text-text-secondary">{data.terms}</p>
            </div>
          )}

          {/* Akceptacja */}
          {canRespond && (
            <div className="flex flex-col gap-3">
              {expired && (
                <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
                  Offertens giltighetstid har gått ut — kontakta oss för en uppdaterad
                  offert.
                </p>
              )}
              {!declineOpen ? (
                <>
                  <button
                    type="button"
                    disabled={respond.isPending}
                    className="press h-12 rounded-(--radius-input) bg-success text-base font-semibold text-white disabled:opacity-60"
                    onClick={() => doRespond(true)}
                  >
                    {respond.isPending ? 'Skickar…' : 'Acceptera offerten'}
                  </button>
                  <button
                    type="button"
                    className="press h-11 rounded-(--radius-input) bg-surface text-sm font-medium text-text-secondary"
                    onClick={() => setDeclineOpen(true)}
                  >
                    Avböj offerten
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
                  <label className="text-xs font-medium text-text-secondary">
                    Meddelande till oss (frivilligt)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="rounded-(--radius-input) border border-line bg-white p-3 text-[1rem] outline-none"
                    placeholder="t.ex. priset är för högt / fel omfattning…"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="press h-11 rounded-(--radius-input) bg-surface text-sm font-medium"
                      onClick={() => setDeclineOpen(false)}
                    >
                      Tillbaka
                    </button>
                    <button
                      type="button"
                      disabled={respond.isPending}
                      className="press h-11 rounded-(--radius-input) bg-error text-sm font-semibold text-white disabled:opacity-60"
                      onClick={() => doRespond(false)}
                    >
                      {respond.isPending ? 'Skickar…' : 'Avböj'}
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-error">{error}</p>}
            </div>
          )}

          {/* Kontakt */}
          <div className="rounded-xl border border-line p-4">
            <h2 className="mb-2 text-base font-semibold" style={{ color: NAVY }}>
              Kontakta oss
            </h2>
            <div className="flex flex-col gap-1.5 text-sm">
              {data.company.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-text-secondary" />
                  <a href={`tel:${data.company.phone}`} className="text-info">
                    {data.company.phone}
                  </a>
                </p>
              )}
              {data.company.email && (
                <p className="flex items-center gap-2">
                  <Mail className="size-4 text-text-secondary" />
                  <a href={`mailto:${data.company.email}`} className="text-info">
                    {data.company.email}
                  </a>
                </p>
              )}
              <p className="flex items-center gap-2">
                <Globe className="size-4 text-text-secondary" />
                <a href="https://www.bftm.se" className="text-info">
                  www.bftm.se
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Stopka */}
        <div
          className="flex flex-col gap-1 px-6 py-5 text-center text-xs text-white/80"
          style={{ backgroundColor: NAVY }}
        >
          <p>
            © {new Date().getFullYear()} {companyName}. Alla rättigheter reserverade.
          </p>
          <p>
            {[
              data.company.org_nr ? `Org.nr ${data.company.org_nr}` : null,
              data.company.vat_nr ? `Momsreg.nr ${data.company.vat_nr}` : null,
              data.company.f_skatt ? 'Godkänd för F-skatt' : null,
            ]
              .filter(Boolean)
              .join(' • ')}
          </p>
        </div>
      </div>
    </div>
  );
}

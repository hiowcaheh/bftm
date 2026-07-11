import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  Car,
  CalendarClock,
  CheckCircle2,
  FileQuestion,
  Globe,
  Hammer,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { money, num } from '@/lib/format';
import { cn } from '@/lib/cn';
import { format } from 'date-fns';
import { logoPublicUrl } from '@/features/settings/api';
import { iconByKey } from '@/lib/iconRegistry';
import { usePublicOffer, useRespondToOffer } from '../hooks';
import { computeOfferTotals } from '../types';

const NAVY = '#1E2A44';
/** Właściciel wpisał samą liczbę? Dopisz naturalne szwedzkie zdanie. */
const isBareNumber = (v: string) => /^\d+([.,]\d+)?$/.test(v.trim());
const fmtGuarantee = (v: string) =>
  isBareNumber(v) ? `${v.trim()} års garanti på utfört arbete` : v;
const fmtAta = (v: string) =>
  isBareNumber(v) ? `ÄTA-arbeten debiteras ${v.trim()} kr/tim efter godkännande` : v;
const fmtTravel = (v: string) =>
  isBareNumber(v) ? `Reseräkning ${v.trim()} kr per arbetsdag` : v;
const fmt = (d: string) => format(new Date(d), 'dd/MM/yyyy');

/** Sekcja pojawiająca się płynnie przy wejściu w kadr (IntersectionObserver). */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // widoczny w kadrze LUB już przewinięty (skok kotwicą/szybki scroll)
        if (entry && (entry.isIntersecting || entry.boundingClientRect.top < 0)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px 80px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out will-change-transform',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
      )}
    >
      {children}
    </div>
  );
}

/** Kwota „Att betala" nabijająca się płynnie do wartości docelowej. */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || started.current) return;
      started.current = true;
      const t0 = performance.now();
      const duration = 900;
      const tick = (t: number) => {
        const p = Math.min((t - t0) / duration, 1);
        setDisplay(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{money(display)}</span>;
}

/**
 * Publiczna strona oferty (link z tokenem) — po SZWEDZKU, bez logowania.
 * Szata firmowa BFTM w wydaniu premium: duże logo na granacie, płynne
 * animacje sekcji, licznik kwoty, przyklejony pasek akceptacji.
 */
export default function PublicOfferPage() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  // podgląd z aplikacji: nie nabija licznika wyświetleń, ma przycisk zamknięcia
  const isPreview = searchParams.get('podglad') === '1';
  const offer = usePublicOffer(token, !isPreview);
  const respond = useRespondToOffer(token);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [heroIn, setHeroIn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroIn(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: NAVY }}>
        <p className="animate-pulse text-sm text-white/70">Laddar offert…</p>
      </div>
    );
  }

  if (!data || !totals) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#F5F5F7] p-6 text-center">
        <FileQuestion className="size-10 text-text-secondary" />
        <p className="text-sm text-text-secondary">
          Offerten hittades inte eller är inte längre tillgänglig.
        </p>
      </div>
    );
  }

  const companyName = data.company.name || data.branding.name || 'BFTM Fasad & Bygg AB';
  const expired =
    data.status === 'sent' &&
    data.valid_until &&
    data.valid_until < format(new Date(), 'yyyy-MM-dd');
  const canRespond = data.status === 'sent';

  const doRespond = (accept: boolean) => {
    setError('');
    respond.mutate(
      { accept, comment },
      {
        onSuccess: () => {
          setDeclineOpen(false);
          setConfirmAccept(false);
        },
        onError: () => setError('Något gick fel. Försök igen eller kontakta oss.'),
      },
    );
  };

  return (
    <div className="min-h-dvh bg-[#F5F5F7]">
      {isPreview && (
        <button
          type="button"
          aria-label="Zamknij podgląd"
          className="press fixed right-4 z-50 flex size-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur"
          style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
          onClick={() => {
            window.close();
            // karta otwarta ręcznie nie zamknie się sama — wróć do aplikacji
            setTimeout(() => {
              window.location.href = `${window.location.origin}${window.location.pathname}#/oferty`;
            }, 150);
          }}
        >
          <X className="size-5" />
        </button>
      )}
      {data.status === 'draft' && (
        <div className="bg-warning px-4 py-2 text-center text-xs font-semibold text-white">
          Förhandsvisning. Offerten är inte skickad än
        </div>
      )}
      {/* HERO — pełnoekranowy granat, duże logo, tytuł */}
      <header
        className="relative overflow-hidden px-6 pt-14 pb-20 text-center"
        style={{
          background: `linear-gradient(180deg, #16203a 0%, ${NAVY} 55%, #2a3a5f 100%)`,
          paddingTop: 'calc(env(safe-area-inset-top) + 3.5rem)',
        }}
      >
        {/* delikatna poświata za logo */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-10 left-1/2 size-96 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #CC0000 0%, transparent 65%)' }}
        />
        <div
          className={cn(
            'relative flex flex-col items-center gap-5 transition-all duration-1000 ease-out',
            heroIn ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
          )}
        >
          {data.branding.logo_path ? (
            <img
              src={logoPublicUrl(data.branding.logo_path)}
              alt={companyName}
              className="max-h-56 w-auto max-w-[21rem] object-contain drop-shadow-2xl"
            />
          ) : (
            <p className="text-3xl font-bold text-white">{companyName}</p>
          )}
          {data.branding.slogan && (
            <p className="text-[11px] font-semibold tracking-[0.35em] text-[#F0716B] uppercase">
              {data.branding.slogan}
            </p>
          )}
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-medium tracking-wide text-white/80 backdrop-blur">
              Offert {data.number}
            </span>
            <h1 className="max-w-xl text-3xl leading-tight font-bold text-white sm:text-4xl">
              {data.title ?? data.number}
            </h1>
            {data.client.name && (
              <p className="text-sm text-white/70">
                Förberedd för <span className="font-semibold text-white">{data.client.name}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* czerwona wstęga marki */}
      <div
        className="h-1.5 w-full"
        style={{ background: 'linear-gradient(90deg, #8E0000, #CC0000 40%, #E85D5D)' }}
      />

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 pb-40 sm:px-6">
        {/* Status */}
        {data.status === 'accepted' && (
          <Reveal>
            <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-5 text-success shadow-(--shadow-card)">
              <CheckCircle2 className="size-7 shrink-0" />
              <p className="text-sm font-semibold">
                Offerten är accepterad{data.responded_at ? ` ${fmt(data.responded_at)}` : ''}.
                Tack för förtroendet! Vi hör av oss inom kort.
              </p>
            </div>
          </Reveal>
        )}
        {data.status === 'rejected' && (
          <Reveal>
            <div className="flex items-center gap-3 rounded-2xl bg-white p-5 text-text-secondary shadow-(--shadow-card)">
              <XCircle className="size-7 shrink-0" />
              <p className="text-sm font-semibold">Offerten har avböjts.</p>
            </div>
          </Reveal>
        )}

        {/* Wstęp + szczegóły */}
        <Reveal>
          <div className="rounded-2xl bg-white p-6 shadow-(--shadow-card)">
            <p className="text-base leading-relaxed">
              {data.client.name ? (
                <>
                  Hej <b>{data.client.name}</b>!{' '}
                </>
              ) : null}
              Tack för visat intresse för våra tjänster. Nedan hittar du en detaljerad
              offert för ditt projekt. Kontakta oss gärna om du har några frågor.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5 text-center max-sm:grid-cols-1 max-sm:text-left">
              {[
                ['Offertnummer', data.number],
                ['Datum', data.issue_date ? fmt(data.issue_date) : '—'],
                ['Giltig till', data.valid_until ? fmt(data.valid_until) : '—'],
              ].map(([label, value]) => (
                <div key={label} className="max-sm:flex max-sm:items-baseline max-sm:justify-between">
                  <p className="text-[11px] tracking-wide text-text-secondary uppercase">
                    {label}
                  </p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Specyfikacja */}
        <Reveal delay={80}>
          <div className="rounded-2xl bg-white p-6 shadow-(--shadow-card)">
            <h2 className="mb-4 text-lg font-bold">Specifikation</h2>
            <div className="flex flex-col divide-y divide-line">
              {data.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-1.5 py-5 first:pt-0 last:pb-0">
                  <p
                    className="text-[10px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: item.is_labor ? '#CC0000' : '#8E8E93' }}
                  >
                    {item.is_labor ? 'Arbete' : 'Material'}
                  </p>
                  <p className="text-[15px] leading-relaxed font-semibold">
                    {item.description}
                  </p>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="tabular-nums text-xs text-text-secondary">
                      {num(item.quantity)} {item.unit ?? ''} × {money(item.unit_price)}
                      {!data.reverse_vat ? `  ·  moms ${num(item.vat_rate)}%` : ''}
                    </p>
                    <span className="tabular-nums shrink-0 text-base font-bold">
                      {money(item.quantity * item.unit_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Sumy — z dużą kwotą */}
        <Reveal delay={120}>
          <div className="overflow-hidden rounded-2xl bg-white shadow-(--shadow-card)">
            <div className="tabular-nums flex flex-col gap-1.5 p-6 text-sm">
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
                <div className="flex justify-between font-medium text-success">
                  <span>ROT-avdrag ({num(data.rot.pct ?? 30)}% på arbetskostnad)</span>
                  <span>−{money(totals.rotDeduction)}</span>
                </div>
              )}
            </div>
            <div
              className="flex items-baseline justify-between px-6 py-5 text-white"
              style={{ backgroundColor: NAVY }}
            >
              <span className="text-sm font-medium text-white/80">Att betala</span>
              <span className="tabular-nums text-3xl font-bold tracking-tight">
                <CountUp value={totals.toPay} />
              </span>
            </div>
            {(totals.rotDeduction > 0 || data.reverse_vat) && (
              <p className="px-6 py-3 text-[11px] leading-relaxed text-text-secondary">
                {totals.rotDeduction > 0 &&
                  `ROT-avdraget förutsätter tillräckligt avdragsutrymme hos Skatteverket (${data.rot_persons} ${data.rot_persons === 1 ? 'person' : 'personer'}). `}
                {data.reverse_vat && 'Omvänd byggmoms tillämpas. Köparen redovisar momsen.'}
              </p>
            )}
          </div>
        </Reveal>

        {/* Bra att veta — gwarancja, ÄTA, dojazd, termin płatności */}
        {(data.guarantee || data.ata_info || data.travel_info || data.payment_days) && (
          <Reveal delay={130}>
            <div className="rounded-2xl bg-white p-6 shadow-(--shadow-card)">
              <h2 className="mb-4 text-lg font-bold">Bra att veta</h2>
              <div className="flex flex-col gap-4">
                {data.guarantee && (
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft">
                      <ShieldCheck className="size-5 text-success" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Garanti</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                        {fmtGuarantee(data.guarantee)}
                      </p>
                    </div>
                  </div>
                )}
                {data.ata_info && (
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                      <Hammer className="size-5" style={{ color: NAVY }} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">ÄTA-arbeten</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                        {fmtAta(data.ata_info)}
                      </p>
                    </div>
                  </div>
                )}
                {data.travel_info && (
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                      <Car className="size-5" style={{ color: NAVY }} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Reseräkning</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                        {fmtTravel(data.travel_info)}
                      </p>
                    </div>
                  </div>
                )}
                {data.payment_days != null && (
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface">
                      <CalendarClock className="size-5" style={{ color: NAVY }} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Betalningsvillkor</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">
                        {data.payment_days} dagar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        )}

        {/* Uwagi / warunki */}
        {(data.notes || data.terms) && (
          <Reveal delay={140}>
            <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-(--shadow-card)">
              {data.notes && (
                <div>
                  <h2 className="mb-1.5 flex items-center gap-2 text-lg font-bold">
                    <MessageSquareText className="size-5" style={{ color: NAVY }} />
                    Kommentarer
                  </h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-text-secondary">
                    {data.notes}
                  </p>
                </div>
              )}
              {data.terms && (
                <div>
                  <h2 className="mb-1.5 text-lg font-bold">Villkor</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-text-secondary">
                    {data.terms}
                  </p>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* O firmie */}
        <Reveal delay={160}>
          <div className="rounded-2xl bg-white p-6 shadow-(--shadow-card)">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="size-5" style={{ color: NAVY }} />
              <h2 className="text-lg font-bold">Om {companyName}</h2>
            </div>
            {data.company.about && (
              <p className="mb-5 text-sm leading-relaxed text-text-secondary">
                {data.company.about}
              </p>
            )}
            {(data.company.services?.length ?? 0) > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-2.5">
                {data.company.services!.map((service) => {
                  const item =
                    typeof service === 'string' ? { name: service, icon: 'Hammer' } : service;
                  const Icon = iconByKey(item.icon);
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-2.5 rounded-xl bg-[#F5F5F7] px-3 py-2.5"
                    >
                      <Icon className="size-4.5 shrink-0" style={{ color: '#CC0000' }} />
                      <span className="text-xs leading-tight font-semibold">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="grid gap-2.5 text-sm sm:grid-cols-2">
              {data.company.address && (
                <p className="flex items-center gap-2.5">
                  <MapPin className="size-4 shrink-0 text-text-secondary" />
                  {data.company.address}
                </p>
              )}
              {(data.company.contacts?.length
                ? data.company.contacts
                : data.company.phone
                  ? [{ name: '', phone: data.company.phone }]
                  : []
              ).map((contact) => (
                <a
                  key={contact.phone}
                  href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}
                  className="flex items-center gap-2.5"
                >
                  <Phone className="size-4 shrink-0 text-text-secondary" />
                  <span>
                    {contact.name ? <b>{contact.name}: </b> : null}
                    <span className="text-info">{contact.phone}</span>
                  </span>
                </a>
              ))}
              {data.company.email && (
                <a href={`mailto:${data.company.email}`} className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-text-secondary" />
                  <span className="text-info">{data.company.email}</span>
                </a>
              )}
              <a href="https://www.bftm.se" className="flex items-center gap-2.5">
                <Globe className="size-4 shrink-0 text-text-secondary" />
                <span className="text-info">www.bftm.se</span>
              </a>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
              {data.company.f_skatt && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-success">
                  <BadgeCheck className="size-3.5 shrink-0" /> Godkänd för F-skatt
                </span>
              )}
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-text-secondary">
                <ShieldCheck className="size-3.5 shrink-0" /> Försäkrade arbeten
              </span>
            </div>
          </div>
        </Reveal>

        {/* Stopka */}
        <Reveal delay={180}>
          <div className="flex flex-col gap-1 pt-2 pb-4 text-center text-xs text-text-secondary">
            <p>
              © {new Date().getFullYear()} {companyName}. Alla rättigheter reserverade.
            </p>
            <p>
              {[
                data.company.org_nr ? `Org.nr ${data.company.org_nr}` : null,
                data.company.vat_nr ? `Momsreg.nr ${data.company.vat_nr}` : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
        </Reveal>
      </main>

      {/* Odmowa — modal z polem na wiadomość */}
      {declineOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <button
            aria-label="Tillbaka"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => !respond.isPending && setDeclineOpen(false)}
            tabIndex={-1}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-center text-lg font-bold">Avböj offerten?</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-text-secondary">
              Berätta gärna varför, så kan vi återkomma med ett bättre förslag.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-line bg-[#F5F5F7] p-3 text-[1rem] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              placeholder="Meddelande till oss (frivilligt)"
            />
            {error && <p className="mt-2 text-center text-xs text-error">{error}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={respond.isPending}
                className="press h-12 rounded-xl bg-[#F5F5F7] text-sm font-medium"
                onClick={() => setDeclineOpen(false)}
              >
                Tillbaka
              </button>
              <button
                type="button"
                disabled={respond.isPending}
                className="press h-12 rounded-xl bg-error text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => doRespond(false)}
              >
                {respond.isPending ? 'Skickar…' : 'Avböj offerten'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Potwierdzenie akceptacji */}
      {confirmAccept && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <button
            aria-label="Avbryt"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => !respond.isPending && setConfirmAccept(false)}
            tabIndex={-1}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle2 className="size-7 text-success" />
            </div>
            <h2 className="text-center text-lg font-bold">Acceptera offerten?</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-text-secondary">
              Du bekräftar att du vill anlita {companyName} enligt offert {data.number}.
            </p>
            <p className="tabular-nums mt-3 rounded-xl bg-[#F5F5F7] py-2.5 text-center text-base font-bold">
              Att betala: {money(totals.toPay)}
            </p>
            {error && <p className="mt-2 text-center text-xs text-error">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={respond.isPending}
                className="press h-12 rounded-xl bg-[#F5F5F7] text-sm font-medium"
                onClick={() => setConfirmAccept(false)}
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={respond.isPending}
                className="press h-12 rounded-xl bg-success text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => doRespond(true)}
              >
                {respond.isPending ? 'Skickar…' : 'Ja, acceptera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Przyklejony pasek akceptacji */}
      {canRespond && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/85 backdrop-blur-xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 sm:px-6">
            {expired && (
              <p className="text-center text-[11px] text-warning">
                Offertens giltighetstid har gått ut. Kontakta oss för en uppdaterad offert.
              </p>
            )}
            {error && <p className="text-center text-[11px] text-error">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="press shrink-0 px-3 text-sm font-medium text-text-secondary"
                onClick={() => setDeclineOpen(true)}
              >
                Avböj
              </button>
              <button
                type="button"
                disabled={respond.isPending}
                className="press h-12 flex-1 rounded-2xl bg-success text-base font-semibold text-white shadow-lg shadow-success/25 transition-transform disabled:opacity-60"
                onClick={() => setConfirmAccept(true)}
              >
                Acceptera offerten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

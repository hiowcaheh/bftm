import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Building2, CalendarOff, Clock, FileQuestion, Users, X } from 'lucide-react';
import { moneyWhole, num } from '@/lib/format';
import { logoPublicUrl } from '@/features/settings/api';
import { ABSENCE_TYPE_COLORS, ABSENCE_TYPE_LABELS } from '@/features/absences/types';
import { usePublicReport } from '../hooks';

const NAVY = '#1E2A44';

/**
 * Publiczna strona raportu godzin (link z tokenem, bez logowania).
 * Po polsku (raport wewnętrzny), w szacie firmy — dla księgowej / wspólnika.
 */
export default function PublicReportPage() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('podglad') === '1';
  const query = usePublicReport(token);
  const data = query.data;

  const period = useMemo(() => {
    if (!data) return '';
    const f = format(new Date(data.period_from), 'd MMM', { locale: pl });
    const t = format(new Date(data.period_to), 'd MMM yyyy', { locale: pl });
    return `${f} – ${t}`;
  }, [data]);

  if (query.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: NAVY }}>
        <p className="animate-pulse text-sm text-white/70">Ładowanie…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#F5F5F7] p-6 text-center">
        <FileQuestion className="size-10 text-text-secondary" />
        <p className="text-sm text-text-secondary">
          Raport nie istnieje lub link wygasł.
        </p>
      </div>
    );
  }

  const r = data.report;
  const finance = r.finance;
  const companyName = data.company.name || data.branding.name || 'BFTM Fasad & Bygg AB';
  const billableTotal = r.by_project.reduce((s, p) => s + (p.billable ?? 0), 0);

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
            setTimeout(() => {
              window.location.href = `${window.location.origin}${window.location.pathname}#/raporty`;
            }, 150);
          }}
        >
          <X className="size-5" />
        </button>
      )}
      <header
        className="flex flex-col items-center gap-4 px-6 pb-10 text-center"
        style={{
          background: `linear-gradient(180deg, #16203a 0%, ${NAVY} 100%)`,
          paddingTop: 'calc(env(safe-area-inset-top) + 3rem)',
        }}
      >
        {data.branding.logo_path ? (
          <img
            src={logoPublicUrl(data.branding.logo_path)}
            alt={companyName}
            className="max-h-28 w-auto max-w-[15rem] object-contain drop-shadow-xl"
          />
        ) : (
          <p className="text-2xl font-bold text-white">{companyName}</p>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{data.title ?? 'Raport godzin'}</h1>
          <p className="mt-1 text-sm text-white/70">{period}</p>
        </div>
      </header>
      <div
        className="h-1.5 w-full"
        style={{ background: 'linear-gradient(90deg, #8E0000, #CC0000 40%, #E85D5D)' }}
      />

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className={finance ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
          <div className="rounded-2xl bg-white p-5 shadow-(--shadow-card)">
            <p className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Clock className="size-4" /> Suma godzin
            </p>
            <p className="tabular-nums mt-1 text-xl font-bold">{num(r.total_hours)} h</p>
          </div>
          {finance && (
            <div className="rounded-2xl bg-white p-5 shadow-(--shadow-card)">
              <p className="text-xs text-text-secondary">Do fakturowania</p>
              <p className="tabular-nums mt-1 text-xl font-bold">
                {moneyWhole(billableTotal)}
              </p>
            </div>
          )}
        </section>

        {/* Pracownicy */}
        <div className="rounded-2xl bg-white p-6 shadow-(--shadow-card)">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Users className="size-5" style={{ color: NAVY }} /> Pracownicy
          </h2>
          <div className="flex flex-col divide-y divide-line">
            {r.by_employee.map((e) => (
              <div key={e.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold">{e.name}</p>
                  <span className="tabular-nums shrink-0 text-base font-bold">
                    {num(e.total)} h
                  </span>
                </div>
                {(e.projects?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-1">
                    {e.projects!.map((p) => (
                      <div key={p.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color ?? '#9E9E9E' }}
                        />
                        <span className="min-w-0 flex-1 truncate text-text-secondary">
                          {p.name}
                        </span>
                        <span className="tabular-nums text-text-secondary">
                          {num(p.hours)} h
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {finance && e.labor_cost != null && (
                  <p className="tabular-nums text-[11px] text-text-secondary">
                    koszt pracy {moneyWhole(e.labor_cost)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Projekty */}
        <div className="rounded-2xl bg-white p-6 shadow-(--shadow-card)">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Building2 className="size-5" style={{ color: NAVY }} /> Projekty
          </h2>
          <div className="flex flex-col divide-y divide-line">
            {r.by_project.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                <div
                  className="h-9 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color ?? '#CC0000' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="tabular-nums text-xs text-text-secondary">
                    {num(p.total)} h • {p.employees}{' '}
                    {p.employees === 1 ? 'pracownik' : 'pracowników'}
                  </p>
                </div>
                {finance && p.billable != null ? (
                  <span className="tabular-nums shrink-0 text-sm font-semibold">
                    {moneyWhole(p.billable)}
                  </span>
                ) : (
                  <span className="tabular-nums shrink-0 text-sm font-semibold">
                    {num(p.total)} h
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Nieobecności */}
        {(r.absences?.length ?? 0) > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-(--shadow-card)">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <CalendarOff className="size-5" style={{ color: NAVY }} /> Nieobecności
            </h2>
            <div className="flex flex-col divide-y divide-line">
              {r.absences!.map((a, i) => {
                const f = format(new Date(a.date_from), 'd MMM', { locale: pl });
                const t = format(new Date(a.date_to), 'd MMM', { locale: pl });
                return (
                  <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ABSENCE_TYPE_COLORS[a.type] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {ABSENCE_TYPE_LABELS[a.type]}
                        {a.note ? ` · ${a.note}` : ''}
                      </p>
                    </div>
                    <span className="tabular-nums shrink-0 text-xs text-text-secondary">
                      {a.date_from === a.date_to ? f : `${f} – ${t}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="pb-6 text-center text-xs text-text-secondary">
          {companyName}
          {data.company.org_nr ? ` • Org.nr ${data.company.org_nr}` : ''} •{' '}
          {format(new Date(data.created_at), 'd MMM yyyy', { locale: pl })}
        </p>
      </main>
    </div>
  );
}

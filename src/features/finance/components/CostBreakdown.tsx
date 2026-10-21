import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { moneyWhole, num } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import { useFinanceSettings } from '@/features/settings/hooks';
import type { FinanceProjectSummary } from '../api';
import { useProjectWorkers } from '../hooks';

interface CostItem {
  id: string;
  name: string;
  color: string;
  value: number;
  /** null = koszty ogólne (bez projektu) — nieklikalne */
  project: FinanceProjectSummary | null;
}

const R = 54;
const STROKE = 18;
const C = 2 * Math.PI * R;
/** Na kole tylko największe projekty — resztę zbiera szary „Pozostałe" (małe łuki są nieklikalne). */
const TOP = 5;
const REST_COLOR = '#9E9EA6';
/** Stonowane kolory paska wypłaty/zostało — te same barwy, mniej intensywne */
const SOFT_RED = 'color-mix(in srgb, var(--color-accent) 55%, white)';
const SOFT_GREEN = 'color-mix(in srgb, var(--color-success) 55%, white)';

const pct1 = (v: number) => v.toFixed(1).replace('.', ',');

/**
 * Struktura kosztów: koło (TOP projektów + „Pozostałe") i lista wszystkich
 * projektów. Klik w wiersz albo łuk zaznacza projekt i otwiera jego koszty.
 */
export function CostBreakdown({
  projects,
  generalCosts,
  from,
  to,
  periodLabel,
}: {
  projects: FinanceProjectSummary[];
  generalCosts: number;
  from: string;
  to: string;
  periodLabel: string;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceProjectSummary | null>(null);
  const [showAll, setShowAll] = useState(false);

  const items = useMemo<CostItem[]>(() => {
    const list: CostItem[] = projects
      .map((p) => ({
        id: p.project_id,
        name: p.name,
        color: p.color ?? '#9E9E9E',
        value: p.labor_cost_range + p.expenses_range,
        project: p,
      }))
      .filter((s) => s.value > 0.5);
    if (generalCosts > 0.5) {
      list.push({ id: 'general', name: t('fin.generalCosts'), color: '#8E8E93', value: generalCosts, project: null });
    }
    return list.sort((a, b) => b.value - a.value);
  }, [projects, generalCosts, t]);

  const total = items.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return null;

  const top = items.slice(0, TOP);
  const rest = items.slice(TOP).reduce((s, x) => s + x.value, 0);
  const arcs = rest > 0.5 ? [...top, { id: 'rest', name: t('fin.others'), color: REST_COLOR, value: rest, project: null }] : top;
  const gap = arcs.length > 1 ? 2.5 : 0;
  const sel = items.find((x) => x.id === selected) ?? null;
  const selIsRest = !!sel && items.indexOf(sel) >= TOP;
  const visible = showAll ? items : items.slice(0, TOP);

  const pick = (item: CostItem) => {
    setSelected(item.id);
    if (item.project) setDetail(item.project);
  };

  let offset = 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto size-52">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90">
          {arcs.map((s) => {
            const len = Math.max((s.value / total) * C - gap, 0);
            const isSel = sel ? s.id === sel.id || (s.id === 'rest' && selIsRest) : false;
            const el = (
              <circle
                key={s.id}
                cx={70}
                cy={70}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: sel && !isSel ? 0.3 : 1 }}
                onClick={() => {
                  if (s.id === 'rest') setShowAll(true);
                  else {
                    const item = items.find((x) => x.id === s.id);
                    if (item) pick(item);
                  }
                }}
              />
            );
            offset += len + gap;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-12 text-center">
          <span className="text-[11px] text-text-secondary">
            {sel ? t('fin.costShare', { p: pct1((sel.value / total) * 100) }) : t('fin.costsTotal')}
          </span>
          <span className="tabular-nums text-lg font-bold">{moneyWhole(sel ? sel.value : total)}</span>
          <span className="max-w-full truncate text-[11px] text-text-secondary">
            {sel ? sel.name : periodLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {visible.map((item, i) => {
          const share = (item.value / total) * 100;
          const isSel = item.id === selected;
          const prevSel = i > 0 && visible[i - 1]!.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.project}
              onClick={() => pick(item)}
              className={cn(
                'press -mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                // kreska między wierszami — schowana przy zaznaczonym, żeby tło było jednolite
                i > 0 && !isSel && !prevSel && 'border-t border-line',
                isSel && 'bg-surface',
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className={cn('mt-1.5 block h-1 overflow-hidden rounded-full', isSel ? 'bg-white' : 'bg-surface')}>
                  <span className="block h-full rounded-full" style={{ width: `${share}%`, backgroundColor: item.color }} />
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tabular-nums block text-[13px] font-semibold">{moneyWhole(item.value)}</span>
                <span className="tabular-nums block text-[11px] text-text-secondary">{pct1(share)}%</span>
              </span>
              <ChevronRight className={cn('size-4 shrink-0 text-text-secondary/50', !item.project && 'invisible')} />
            </button>
          );
        })}
      </div>
      {!showAll && items.length > TOP && (
        <button type="button" className="text-sm font-semibold text-accent" onClick={() => setShowAll(true)}>
          {t('fin.showAllN', { n: items.length })}
        </button>
      )}

      <ProjectCostSheet project={detail} from={from} to={to} periodLabel={periodLabel} onClose={() => setDetail(null)} />
    </div>
  );
}

/** Okno „Koszty projektu": godziny, kto pracował, przychód, wypłaty, ile zostało. */
function ProjectCostSheet({
  project,
  from,
  to,
  periodLabel,
  onClose,
}: {
  project: FinanceProjectSummary | null;
  from: string;
  to: string;
  periodLabel: string;
  onClose: () => void;
}) {
  const { t, tp } = useI18n();
  const navigate = useNavigate();
  const workers = useProjectWorkers(project?.project_id ?? null, from, to);
  const settings = useFinanceSettings(!!project);
  if (!project) return null;

  const p = project;
  const byHours = p.billing_type !== 'fixed' && !!p.hourly_rate;
  const revenue = byHours ? p.hours_range * (p.hourly_rate ?? 0) : null;
  const costs = p.labor_cost_range + p.expenses_range;
  const left = revenue !== null ? revenue - costs : null;
  const people = workers.data?.length ?? 0;

  const kpi = (label: string, value: string, sub: string) => (
    <div className="rounded-xl bg-bg p-3">
      <p className="text-[11.5px] text-text-secondary">{label}</p>
      <p className="tabular-nums mt-0.5 text-[17px] font-bold">{value}</p>
      <p className="truncate text-[11px] text-text-secondary">{sub}</p>
    </div>
  );

  return (
    <Sheet open onClose={onClose} title={t('fin.projectCosts')}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="flex items-center gap-2.5 text-[17px] font-bold">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? '#9E9E9E' }} />
            <span className="truncate">{p.name}</span>
          </p>
          <p className="mt-0.5 text-xs text-text-secondary first-letter:uppercase">{periodLabel}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {kpi(t('fin.kHours'), `${num(p.hours_range)} h`, people ? tp('fin.people', people).replace('{n}', String(people)) : ' ')}
          {kpi(
            t('fin.kRevenue'),
            revenue !== null ? moneyWhole(revenue) : '—',
            revenue !== null ? `${num(p.hours_range)} h × ${num(p.hourly_rate ?? 0)} kr` : t('fin.fixedRev'),
          )}
          {kpi(
            t('fin.kLabor'),
            moneyWhole(p.labor_cost_range),
            settings.data?.include_vacation_in_labor_cost ? t('fin.laborVac') : t('fin.laborFees'),
          )}
          {kpi(t('fin.kOther'), moneyWhole(p.expenses_range), t('fin.otherSub'))}
        </div>

        {left !== null && revenue! > 0 ? (
          <>
            <div
              className={cn(
                'flex items-center justify-between rounded-xl p-3.5',
                left >= 0 ? 'bg-success-soft text-success' : 'bg-error-soft text-error',
              )}
            >
              <div>
                <p className="text-[13px] font-semibold">{left >= 0 ? t('fin.left') : t('fin.loss')}</p>
                <p className="text-[11px] font-medium">
                  {t('fin.margin', { p: Math.round((left / revenue!) * 100) })}
                </p>
              </div>
              <p className="tabular-nums text-[22px] font-extrabold">
                {left >= 0 ? '+' : ''}
                {moneyWhole(left)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface">
                <span style={{ width: `${Math.min(100, (costs / revenue!) * 100)}%`, backgroundColor: SOFT_RED }} />
                <span style={{ width: `${Math.max(0, (left / revenue!) * 100)}%`, backgroundColor: SOFT_GREEN }} />
              </div>
              <div className="flex gap-3 text-[11px] text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: SOFT_RED }} />
                  {t('fin.legendLabor', { p: Math.round(Math.min(100, (costs / revenue!) * 100)) })}
                </span>
                {left > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm" style={{ backgroundColor: SOFT_GREEN }} />
                    {t('fin.legendLeft', { p: Math.round((left / revenue!) * 100) })}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-surface p-3.5 text-xs text-text-secondary">{t('fin.fixedNote')}</p>
        )}

        {(workers.data ?? []).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-text-secondary uppercase">
              {t('fin.whoWorked')}
            </p>
            <div className="flex flex-col divide-y divide-line">
              {workers.data!.map((w) => (
                <div key={w.id} className="flex items-center gap-2.5 py-2">
                  <Avatar name={w.name} path={w.avatarPath} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{w.name}</span>
                  <span className="tabular-nums text-sm font-semibold">{num(w.hours)} h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="press flex h-11 items-center justify-center gap-1 rounded-xl bg-surface text-sm font-semibold"
          onClick={() => navigate(`/projekty/${p.project_id}`)}
        >
          {t('fin.openProject')}
          <ChevronRight className="size-4" />
        </button>
      </div>
    </Sheet>
  );
}

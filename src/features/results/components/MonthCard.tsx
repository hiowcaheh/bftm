import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { num } from '@/lib/format';
import { useI18n } from '@/lib/i18n/context';
import type { MonthStat } from '../analysis';
import type { MonthStory } from '../story';

type Badge = 'best' | 'worst' | 'live' | 'first' | null;

/** Analiza jednego miesiąca: liczby, komentarz, projekty, zespół, pieniądze. */
export function MonthCard({
  x,
  prev,
  title,
  sub,
  badge,
  story,
  money,
  hours,
  flash,
}: {
  x: MonthStat;
  prev: MonthStat | null;
  title: string;
  sub: string;
  badge: Badge;
  story: MonthStory;
  money: (n: number) => string;
  hours: (n: number) => string;
  flash: boolean;
}) {
  const { t } = useI18n();
  const pct = (m: number | null) => (m === null ? '—' : `${Math.round(m * 100)}%`);
  const vsPrev = (cur: number, p: number | undefined) => {
    if (x.live || p === undefined || Math.abs(p) < 1) return undefined;
    const d = Math.round(((cur - p) / Math.abs(p)) * 100);
    return t('res.vsPrev', { p: `${d >= 0 ? '+' : '−'}${Math.abs(d)}` });
  };
  // pasek = udział projektu w zysku miesiąca (jak w Finansach), nie porównanie z najlepszym
  const profitBase =
    x.result > 0 ? x.result : Math.max(1, x.projects.reduce((s, p) => s + Math.max(0, p.result), 0));
  // najlepsze i najsłabsze — problemy z dołu listy też muszą być widoczne
  const topProjects =
    x.projects.length > 6 ? [...x.projects.slice(0, 4), ...x.projects.slice(-2)] : x.projects;

  return (
    <Card className={cn('flex flex-col gap-3 p-4', flash && 'animate-flash-ring')}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[22px] font-extrabold tracking-tight capitalize">{title}</h2>
        {badge && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap',
              badge === 'best' && 'bg-success-soft text-success',
              badge === 'worst' && 'bg-error-soft text-error',
              badge === 'live' && 'bg-accent-soft text-accent',
              badge === 'first' && 'bg-surface text-text-secondary',
            )}
          >
            {badge === 'live' && x.live
              ? t('res.badgeLive', { done: x.live.done, total: x.live.total })
              : t(`res.badge_${badge}`)}
          </span>
        )}
      </div>
      <p className="-mt-2 text-[12.5px] text-text-secondary">{sub}</p>

      <div className="grid grid-cols-2 gap-2">
        <Kpi label={t('res.revenue')} value={money(x.revenue)} hint={x.live ? t('res.forecastShort', { v: money(x.live.revenue) }) : vsPrev(x.revenue, prev?.revenue)} />
        <Kpi label={t('res.costs')} value={money(x.cost)} hint={vsPrev(x.cost, prev?.cost)} />
        <Kpi
          label={t('res.result')}
          value={`${x.result >= 0 ? '+' : ''}${money(x.result)}`}
          tone={x.result >= 0 ? 'ok' : 'bad'}
          hint={x.live ? t('res.forecastShort', { v: money(x.live.result) }) : vsPrev(x.result, prev?.result)}
        />
        <Kpi
          label={t('res.margin')}
          value={pct(x.margin)}
          hint={x.hours > 0 ? t('res.perHour', { v: money(x.revenue / x.hours) }) : undefined}
        />
      </div>

      {x.live && (
        <div className="flex flex-col gap-2 rounded-xl border-[1.5px] border-dashed border-accent/35 bg-accent-soft px-3 py-2.5">
          <span className="text-xs font-bold tracking-wide text-accent uppercase">{t('res.forecastTitle')}</span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Mini label={t('res.revenue')} value={`~ ${money(x.live.revenue)}`} />
            <Mini label={t('res.costs')} value={`~ ${money(x.live.cost)}`} />
            <Mini label={t('res.result')} value={`~ ${x.live.result >= 0 ? '+' : ''}${money(x.live.result)}`} ok />
            <Mini label={t('res.hoursLabel')} value={`~ ${hours(x.live.hours)}`} />
          </div>
          <p className="text-xs leading-snug text-text-secondary">
            {t('res.forecastWhy', {
              h: hours(x.hours),
              done: x.live.done,
              perDay: num(Math.round((x.hours / x.live.done) * 10) / 10),
              total: x.live.total,
            })}
          </p>
        </div>
      )}

      {story.paragraphs.map((text) => (
        <p key={text} className="text-sm leading-relaxed">
          {text}
        </p>
      ))}

      {story.good.length > 0 && <Bullets title={t('res.goodTitle')} items={story.good} tone="ok" />}
      {story.watch.length > 0 && <Bullets title={t('res.watchTitle')} items={story.watch} tone="warn" />}

      <Section title={t('res.projectsTitle')}>
        {topProjects.map((p) => {
          const color =
            p.revenue <= 0 || p.result <= 0
              ? 'var(--color-error)'
              : (p.margin ?? 0) < 0.15
                ? 'var(--color-warning)'
                : 'var(--color-success)';
          return (
            <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-1">
              <span className="truncate text-[13.5px] font-medium">{p.name}</span>
              <span className="tabular-nums text-[13px] font-bold whitespace-nowrap" style={{ color }}>
                {p.result >= 0 ? '+' : '−'}
                {money(Math.abs(p.result))}
              </span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, (p.result / profitBase) * 100))}%`, background: color }}
                />
              </span>
              <span className="tabular-nums col-span-2 text-[11.5px] text-text-secondary/80">
                <b className="font-semibold text-text-secondary">
                  {p.result > 0
                    ? t('res.shareOfMonth', { p: Math.round((p.result / profitBase) * 100) })
                    : t('res.noProfit')}
                </b>
                {' · '}
                {t('res.projectLine', { h: hours(p.hours), rev: money(p.revenue), m: pct(p.margin) })}
              </span>
            </div>
          );
        })}
        {x.result > 0 && (
          <p className="text-[11.5px] leading-snug text-text-secondary/80">
            {t('res.projectsBarNote', { v: `+${money(x.result)}` })}
          </p>
        )}
      </Section>

      <Section title={t('res.teamTitle')}>
        {/* przewijane w bok — więcej niż 5 osób nie spada do drugiego rzędu */}
        <div className="relative">
          <div className="no-scrollbar -mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1">
          {x.team.map((m) => (
            <div key={m.id} className="w-[58px] flex-none snap-start text-center">
              <Avatar name={m.name} path={m.avatar} size="sm" className="mx-auto mb-1" />
              <div className="tabular-nums text-[13px] font-bold">{hours(m.hours)}</div>
              <div className="truncate text-[11px] text-text-secondary">{m.name.split(' ')[0]}</div>
            </div>
          ))}
          </div>
          {x.team.length > 5 && (
            <span className="pointer-events-none absolute inset-y-0 -right-4 w-7 bg-linear-to-r from-transparent to-white" />
          )}
        </div>
      </Section>

      <Section title={t('res.cashTitle')}>
        <div className="grid grid-cols-2 gap-2">
          <Kpi label={t('res.sentInvoices')} value={money(x.invoicedSent)} hint={t('res.sentHint')} />
          <Kpi label={t('res.paidIn')} value={money(x.paidIn)} hint={t('res.paidHint')} />
        </div>
        <p className="text-[13px] leading-snug text-text-secondary">{story.cash}</p>
      </Section>

      <p className="text-[11.5px] leading-snug text-text-secondary/80">{t('res.method')}</p>
    </Card>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="min-w-0 rounded-xl bg-bg px-3 py-2.5">
      <div className="text-[11.5px] text-text-secondary">{label}</div>
      <div
        className={cn(
          'tabular-nums mt-0.5 truncate text-[15.5px] font-bold',
          tone === 'ok' && 'text-success',
          tone === 'bad' && 'text-error',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-text-secondary/80">{hint}</div>}
    </div>
  );
}

function Mini({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] text-text-secondary">{label}</div>
      <div className={cn('tabular-nums truncate text-[15px] font-bold', ok && 'text-success')}>{value}</div>
    </div>
  );
}

function Bullets({ title, items, tone }: { title: string; items: string[]; tone: 'ok' | 'warn' }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[13px] font-bold">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((s) => (
          <li key={s} className="relative pl-4 text-[13.5px] leading-snug">
            <span
              className={cn(
                'absolute top-[0.45em] left-0.5 size-[7px] rounded-full',
                tone === 'ok' ? 'bg-success' : 'bg-warning',
              )}
            />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="h-px bg-line" />
      <p className="text-xs font-semibold tracking-wide text-text-secondary uppercase">{title}</p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </>
  );
}

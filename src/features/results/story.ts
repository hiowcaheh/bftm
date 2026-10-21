import type { MonthStat, YearStat } from './analysis';

/**
 * Komentarze do Rezultatu układane regułami z liczb (bez AI — za darmo,
 * od razu i we wszystkich językach). Każde zdanie to klucz `res.*` w słowniku.
 * Zasada: ostrzegamy tylko przy prawdziwym problemie (np. faktura po terminie),
 * a nie przy normalnym czekaniu na zapłatę za poprzedni miesiąc.
 */

type T = (key: string, vars?: Record<string, string | number>) => string;
type TP = (key: string, n: number) => string;

export interface StoryFmt {
  money: (n: number) => string;
  hours: (n: number) => string;
  day: (iso: string) => string;
  /** liczba z przecinkiem wg języka („8,4") */
  num: (n: number) => string;
  /** „wrzesień" / „wrz" */
  month: (m: number) => string;
  monthShort: (m: number) => string;
}

export interface MonthStory {
  text: string;
  good: string[];
  watch: string[];
  cash: string;
}

const pct = (a: number, b: number) => Math.round(((a - b) / Math.abs(b)) * 100);
const pp = (m: number | null) => (m === null ? 0 : Math.round(m * 100));
const plural = (tp: TP, key: string, n: number) => tp(key, n).replace('{n}', String(n));

export function monthStory(
  x: MonthStat,
  prev: MonthStat | null,
  y: YearStat,
  t: T,
  tp: TP,
  f: StoryFmt,
): MonthStory {
  const s: string[] = [];
  const good: string[] = [];
  const watch: string[] = [];

  // 1. Status miesiąca
  if (x.live) s.push(t('res.sLive', { done: x.live.done, total: x.live.total }));
  else if (x.first && x.firstDay) s.push(t('res.sFirst', { date: f.day(x.firstDay) }));
  if (y.bestM === x.m) s.push(t('res.sBest'));
  else if (y.worstM === x.m) s.push(t('res.sWorst'));

  // 2. Godziny i ich przyczyny
  const projectsOn = plural(tp, 'res.onProjects', x.projectCount);
  if (prev && prev.hours > 0 && !x.live) {
    const d = pct(x.hours, prev.hours);
    if (d >= 5) s.push(t('res.sHoursUp', { h: f.hours(x.hours), pct: d, prev: f.hours(prev.hours), projects: projectsOn }));
    else if (d <= -5) s.push(t('res.sHoursDown', { h: f.hours(x.hours), pct: -d, prev: f.hours(prev.hours), projects: projectsOn }));
    else s.push(t('res.sHoursSame', { h: f.hours(x.hours), prev: f.hours(prev.hours), projects: projectsOn }));
  } else {
    s.push(t('res.sHours', { h: f.hours(x.hours), projects: projectsOn }));
  }
  if (x.absenceDays >= 5) {
    const types = Object.entries(x.absenceByType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, days]) => `${t(`absence.${type}`).toLowerCase()} ${days}`)
      .join(', ');
    s.push(t('res.sAbsence', { days: x.absenceDays, types }));
  }
  if (x.newProjects >= 3 && !x.first) s.push(plural(tp, 'res.sNewProjects', x.newProjects));

  // 3. Wynik i marża
  if (x.result < 0) {
    s.push(t('res.sLoss', { res: f.money(x.result) }));
  } else if (prev && prev.result > 0 && !x.live) {
    const d = pct(x.result, prev.result);
    s.push(
      t(d >= 0 ? 'res.sResultUp' : 'res.sResultDown', {
        res: f.money(x.result),
        m: pp(x.margin),
        pct: Math.abs(d),
      }),
    );
  } else {
    s.push(t('res.sResult', { res: f.money(x.result), m: pp(x.margin) }));
  }
  if (prev && prev.margin !== null && x.margin !== null) {
    const a = pp(prev.margin);
    const b = pp(x.margin);
    if (b - a >= 5) s.push(t('res.sMarginUp', { a, b }));
    else if (a - b >= 5) s.push(t('res.sMarginDown', { a, b }));
  }
  const top = x.projects[0];
  const topIsGood = !!top && top.result > 0 && top.margin !== null && top.margin >= 0.2;
  if (top && top.result > 0 && x.projects.length >= 2 && !topIsGood) {
    s.push(t('res.sTopProject', { name: top.name, res: f.money(top.result), h: f.hours(top.hours) }));
  }
  if (x.live) {
    s.push(t('res.sForecast', { h: f.hours(x.live.hours), res: f.money(x.live.result) }));
  }

  // Co zadziałało
  if (top && topIsGood) {
    good.push(t('res.gTopProject', { name: top.name, h: f.hours(top.hours), res: f.money(top.result), m: pp(top.margin) }));
  }
  if (prev && prev.hours > 0 && x.hours > 0) {
    const rate = x.revenue / x.hours;
    const prevRate = prev.revenue / prev.hours;
    if (prevRate > 0 && pct(rate, prevRate) >= 5) {
      good.push(t('res.gRate', { v: f.money(rate), p: f.money(prevRate) }));
    }
  }
  const lead = x.team[0];
  if (lead && x.team.length >= 2) {
    good.push(t('res.gPerson', { name: lead.name.split(' ')[0] ?? lead.name, h: f.hours(lead.hours), days: plural(tp, 'res.inDays', lead.days) }));
  }
  if (x.paidIn > 0) good.push(t('res.gPaid', { v: f.money(x.paidIn) }));
  const perDay = x.personDays > 0 ? x.hours / x.personDays : 0;
  if (perDay >= 8.2) good.push(t('res.gLongDays', { v: f.num(Math.round(perDay * 10) / 10) }));
  if (x.weekendDays === 0 && x.hours > 0) good.push(t('res.gNoWeekend'));

  // Na co uważać. Projekty „na zero" jednego klienta (np. ta sama niska
  // stawka) zbieramy w jedną linijkę — wtedy widać, że problemem jest klient.
  const weak = x.projects.filter(
    (p) => p.hours >= 4 && p.revenue > 0 && p.margin !== null && p.margin < 0.05,
  );
  const weakByClient: Record<string, typeof weak> = {};
  for (const p of weak) (weakByClient[p.clientId ?? p.id] ??= []).push(p);
  for (const group of Object.values(weakByClient)) {
    const p = group[0]!;
    if (group.length >= 2 && p.client) {
      const h = group.reduce((a, g) => a + g.hours, 0);
      const r = group.reduce((a, g) => a + g.result, 0);
      watch.push(
        t('res.wClientZero', {
          client: p.client,
          names: group.map((g) => g.name).join(', '),
          h: f.hours(h),
          res: f.money(r),
        }),
      );
    } else if (p.margin! < -0.05) {
      watch.push(t('res.wLoss', { name: p.name, rev: f.money(p.revenue), cost: f.money(p.cost) }));
    } else {
      watch.push(t('res.wZero', { name: p.name, rev: f.money(p.revenue), cost: f.money(p.cost) }));
    }
  }
  for (const p of x.projects) {
    if (p.revenue <= 0 && p.hours >= 8) {
      watch.push(t('res.wNoRevenue', { name: p.name, h: f.hours(p.hours), cost: f.money(p.cost) }));
    } else if (p.margin !== null && p.margin >= 0.05 && p.margin < 0.15 && p.hours >= 20) {
      watch.push(t('res.wLow', { name: p.name, m: pp(p.margin) }));
    }
  }
  const byHours = [...x.projects].sort((a, b) => b.hours - a.hours)[0];
  if (byHours && x.projects.length >= 2 && x.hours > 0 && byHours.hours / x.hours >= 0.6) {
    watch.push(t('res.wConcentration', { p: Math.round((byHours.hours / x.hours) * 100), name: byHours.name }));
  }
  if (x.weekendDays >= 2) watch.push(t('res.wWeekend', { n: x.weekendDays, h: f.hours(x.weekendHours) }));
  if (x.overdueCount > 0) watch.push(t('res.wOverdue', { v: f.money(x.overdueAmount), n: x.overdueCount }));

  // Pieniądze: wpływy za wcześniejszą pracę; czekające faktury to norma
  const cash: string[] = [];
  cash.push(x.paidIn > 0 ? t('res.cashPaid', { v: f.money(x.paidIn) }) : t('res.cashNone'));
  if (x.pendingAmount > 0 && x.pendingLastDue) {
    cash.push(t('res.cashPending', { v: f.money(x.pendingAmount), date: f.day(x.pendingLastDue) }));
  }
  if (x.overdueAmount > 0) cash.push(t('res.cashOverdue', { v: f.money(x.overdueAmount) }));

  return { text: s.join(' '), good: good.slice(0, 4), watch: watch.slice(0, 4), cash: cash.join(' ') };
}

export function yearStory(y: YearStat, t: T, f: StoryFmt): string {
  const present = y.months.filter((x): x is MonthStat => !!x);
  const first = present[0];
  const last = present[present.length - 1];
  if (!first || !last) return '';
  const s: string[] = [];
  const range = first !== last ? `${f.monthShort(first.m)}–${f.monthShort(last.m)}` : f.month(first.m);
  s.push(
    t('res.ySummary', {
      range,
      rev: f.money(y.totals.revenue),
      cost: f.money(y.totals.cost),
      res: f.money(y.totals.result),
      m: pp(y.totals.margin),
    }),
  );
  const minus = present.filter((x) => x.result < 0).length;
  if (present.length >= 2) {
    s.push(minus === 0 ? t('res.yAllPositive') : t('res.yNegative', { n: minus }));
  }
  if (y.bestM) {
    const b = y.months[y.bestM - 1]!;
    s.push(t('res.yBest', { month: f.month(b.m), res: f.money(b.result) }));
  }
  const named = y.clients.filter((c) => c.name && c.hours >= 40 && c.margin !== null);
  if (y.clients[0]?.name) {
    s.push(t('res.yTopClient', { name: y.clients[0].name, rev: f.money(y.clients[0].revenue) }));
  }
  if (named.length >= 2) {
    const best = named.reduce((a, b) => (b.margin! > a.margin! ? b : a));
    const weak = named.reduce((a, b) => (b.margin! < a.margin! ? b : a));
    s.push(t('res.yBestMargin', { name: best.name!, m: pp(best.margin) }));
    if (weak !== best && weak.margin! < 0.15) {
      s.push(t('res.yWeak', { name: weak.name!, h: f.hours(weak.hours), m: pp(weak.margin) }));
    }
  }
  return s.join(' ');
}

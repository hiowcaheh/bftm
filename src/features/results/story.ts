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
  /** opis miesiąca jak od księgowego: ludzie i czas, pieniądze, projekty */
  paragraphs: string[];
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
  const good: string[] = [];
  const watch: string[] = [];
  const paragraphs: string[] = [];
  const closedPrev = prev && !x.live ? prev : null;

  // ── 1. Ludzie i czas pracy ─────────────────────────────────────────────
  const p1: string[] = [];
  if (x.live) p1.push(t('res.sLive', { done: x.live.done, total: x.live.total }));
  else if (x.first && x.firstDay) p1.push(t('res.sFirst', { date: f.day(x.firstDay) }));
  if (y.bestM === x.m) p1.push(t('res.sBest'));
  else if (y.worstM === x.m) p1.push(t('res.sWorst'));

  const perDay = x.personDays > 0 ? x.hours / x.personDays : 0;
  p1.push(
    t('res.p1Team', {
      people: plural(tp, 'res.peopleCount', x.team.length || x.people),
      h: f.hours(x.hours),
      days: x.workdaysAvail,
      perDay: f.num(Math.round(perDay * 10) / 10),
    }),
  );
  const hoursDelta = closedPrev && closedPrev.hours > 0 ? pct(x.hours, closedPrev.hours) : null;
  if (hoursDelta !== null) {
    const prevH = f.hours(closedPrev!.hours);
    if (hoursDelta >= 5) p1.push(t('res.p1Up', { pct: hoursDelta, prev: prevH }));
    else if (hoursDelta <= -5) p1.push(t('res.p1Down', { pct: -hoursDelta, prev: prevH }));
    else p1.push(t('res.p1Same', { prev: prevH }));
  }
  const util = x.capacity > 0 ? Math.round((x.hours / x.capacity) * 100) : null;
  if (util !== null) p1.push(t('res.p1Util', { cap: f.hours(x.capacity), u: util }));

  // tempo bieżącego miesiąca na tle poprzedniego (godziny firmy na dzień roboczy)
  if (x.live && prev && prev.workdaysAvail > 0 && x.workdaysAvail > 0) {
    p1.push(
      t('res.p1Pace', {
        v: f.num(Math.round((x.hours / x.workdaysAvail) * 10) / 10),
        p: f.num(Math.round((prev.hours / prev.workdaysAvail) * 10) / 10),
      }),
    );
  }

  if (x.absences.length) {
    // osoba + typ → jedna pozycja z kilkoma okresami; te same okresy u kilku
    // osób → jedna pozycja z imionami („Petro i Serhii – bezpłatne wolne 17–28 sie")
    const range = (from: string, to: string) =>
      from === to
        ? f.day(from)
        : from.slice(0, 7) === to.slice(0, 7)
          ? `${Number(from.slice(8))}–${f.day(to)}`
          : `${f.day(from)}–${f.day(to)}`;
    // osoba → „urlop 3–7 sie, 10–11 sie i bezpłatne wolne 12–14 sie"
    const perPerson: Record<string, { name: string; from: string; byType: Record<string, string[]> }> = {};
    for (const a of [...x.absences].sort((a1, a2) => a1.from.localeCompare(a2.from))) {
      const e = (perPerson[a.name] ??= { name: a.name, from: a.from, byType: {} });
      (e.byType[a.type] ??= []).push(range(a.from, a.to));
    }
    const groups: Record<string, { names: string[]; desc: string; from: string }> = {};
    for (const e of Object.values(perPerson)) {
      const desc = Object.entries(e.byType)
        .map(([type, ranges]) => `${t(`res.abs_${type}`)} ${ranges.join(', ')}`)
        .join(t('res.and'));
      const g = (groups[desc] ??= { names: [], desc, from: e.from });
      g.names.push(e.name);
    }
    const list = Object.values(groups)
      .sort((g1, g2) => g1.from.localeCompare(g2.from))
      .map((g) => `${g.names.join(t('res.and'))} – ${g.desc}`)
      .join('; ');
    const dropped = hoursDelta !== null && hoursDelta <= -10;
    const lowUtil = util !== null && util < 75;
    p1.push(t(dropped ? 'res.p1AbsWhyDrop' : lowUtil ? 'res.p1AbsWhyUtil' : 'res.p1Abs', { list }));
    if (x.absenceDays >= 3) {
      p1.push(t('res.p1AbsTotal', { d: plural(tp, 'res.workdaysCount', x.absenceDays), h: f.hours(x.absenceDays * 8) }));
    }
  }

  // największa zmiana godzin jednej osoby względem poprzedniego miesiąca
  if (closedPrev) {
    let best: { name: string; h: number; prev: number } | null = null;
    for (const m of x.team) {
      const before = closedPrev.team.find((p) => p.id === m.id);
      if (!before) continue;
      const d = Math.abs(m.hours - before.hours);
      if (d >= 30 && (!best || d > Math.abs(best.h - best.prev))) {
        best = { name: m.name.split(' ')[0] ?? m.name, h: m.hours, prev: before.hours };
      }
    }
    if (best) p1.push(t('res.p1Person', { name: best.name, h: f.hours(best.h), prev: f.hours(best.prev) }));
  }
  paragraphs.push(p1.join(' '));

  // ── 2. Pieniądze z pracy ───────────────────────────────────────────────
  const p2: string[] = [];
  p2.push(t('res.p2Money', { rev: f.money(x.revenue), cost: f.money(x.cost) }));
  if (closedPrev && closedPrev.revenue > 0 && closedPrev.cost > 0) {
    const rd = pct(x.revenue, closedPrev.revenue);
    const cd = pct(x.cost, closedPrev.cost);
    p2.push(
      `${t(rd >= 0 ? 'res.p2RevUp' : 'res.p2RevDown', { p: Math.abs(rd) })}${t('res.p2And')}${t(
        cd >= 0 ? 'res.p2CostUp' : 'res.p2CostDown',
        { p: Math.abs(cd) },
      )}.`,
    );
  }
  p2.push(
    x.result < 0
      ? t('res.sLoss', { res: f.money(x.result) })
      : t('res.p2Result', { res: f.money(x.result), m: pp(x.margin) }),
  );
  if (x.hours > 0) {
    const rate = x.revenue / x.hours;
    const costH = x.cost / x.hours;
    const a = prev && prev.margin !== null ? pp(prev.margin) : null;
    const b = pp(x.margin);
    if (prev && prev.hours > 0 && a !== null && Math.abs(b - a) >= 3) {
      p2.push(
        t(b > a ? 'res.p2MarginUpWhy' : 'res.p2MarginDownWhy', {
          a,
          b,
          rate: f.money(rate),
          prate: f.money(prev.revenue / prev.hours),
          cost: f.money(costH),
          pcost: f.money(prev.cost / prev.hours),
        }),
      );
    } else {
      p2.push(t('res.p2PerHour', { rate: f.money(rate), cost: f.money(costH), profit: f.money(rate - costH) }));
    }
  }
  // na tle średniej z pełnych, zakończonych miesięcy roku
  const full = y.months.filter((m): m is MonthStat => !!m && !m.first && !m.live);
  if (!x.live && !x.first && full.length >= 3) {
    const avg = full.reduce((sum, m) => sum + m.result, 0) / full.length;
    if (avg > 0) {
      const d = pct(x.result, avg);
      if (Math.abs(d) >= 5) {
        p2.push(t(d > 0 ? 'res.p2AvgUp' : 'res.p2AvgDown', { p: Math.abs(d), avg: f.money(avg) }));
      }
    }
  }
  paragraphs.push(p2.join(' '));

  // ── 3. Projekty ────────────────────────────────────────────────────────
  const p3: string[] = [];
  p3.push(t('res.p3Count', { projects: plural(tp, 'res.onProjects', x.projectCount) }));
  if (x.newProjects >= 2 && !x.first) p3.push(plural(tp, 'res.sNewProjects', x.newProjects));
  const profitBase = x.result > 0 ? x.result : 0;
  const top = x.projects[0];
  if (top && top.result > 0) {
    p3.push(
      t('res.p3Top', {
        name: top.name,
        res: f.money(top.result),
        share: profitBase ? Math.round((top.result / profitBase) * 100) : 0,
        h: f.hours(top.hours),
        m: pp(top.margin),
      }),
    );
    const second = x.projects[1];
    if (second && second.result > 0) {
      p3.push(
        t('res.p3Second', {
          name: second.name,
          res: f.money(second.result),
          share: profitBase ? Math.round((second.result / profitBase) * 100) : 0,
        }),
      );
    }
  }
  if (x.live) p3.push(t('res.sForecast', { h: f.hours(x.live.hours), res: f.money(x.live.result) }));
  paragraphs.push(p3.join(' '));

  // Co zadziałało (bez powtórek z opisu)
  if (util !== null && util >= 90) good.push(t('res.gUtil', { u: util }));
  const lead = x.team[0];
  if (lead && x.team.length >= 2) {
    good.push(t('res.gPerson', { name: lead.name.split(' ')[0] ?? lead.name, h: f.hours(lead.hours), days: plural(tp, 'res.inDays', lead.days) }));
  }
  if (x.paidIn > 0) good.push(t('res.gPaid', { v: f.money(x.paidIn) }));
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

  return { paragraphs, good: good.slice(0, 4), watch: watch.slice(0, 4), cash: cash.join(' ') };
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

import type { ResultsYearData } from './api';

/**
 * Liczby roku do zakładki Rezultat — czyste funkcje, bez UI i tłumaczeń
 * (teksty układa story.ts). Wszystko w zwykłych obiektach/tablicach.
 */

export interface ProjectStat {
  id: string;
  name: string;
  color: string | null;
  clientId: string | null;
  client: string | null;
  hours: number;
  revenue: number;
  cost: number;
  result: number;
  /** null gdy brak przychodu (projekt bez stawki) */
  margin: number | null;
}

export interface TeamStat {
  id: string;
  name: string;
  avatar: string | null;
  hours: number;
  days: number;
}

export interface Forecast {
  hours: number;
  revenue: number;
  cost: number;
  result: number;
  /** dni robocze (pn–pt): miniony kawałek i cały miesiąc */
  done: number;
  total: number;
}

export interface MonthStat {
  /** 1–12 */
  m: number;
  hours: number;
  revenue: number;
  cost: number;
  result: number;
  margin: number | null;
  people: number;
  projectCount: number;
  personDays: number;
  weekendDays: number;
  weekendHours: number;
  newProjects: number;
  absenceDays: number;
  absenceByType: Record<string, number>;
  /** faktury wysłane / opłacone w tym miesiącu */
  invoicedSent: number;
  paidIn: number;
  /** z faktur wysłanych w tym miesiącu: po terminie i jeszcze przed terminem */
  overdueAmount: number;
  overdueCount: number;
  pendingAmount: number;
  pendingLastDue: string | null;
  live: Forecast | null;
  /** pierwszy miesiąc z danymi w aplikacji (niepełny) */
  first: boolean;
  /** dzień pierwszych danych, gdy first */
  firstDay: string | null;
  projects: ProjectStat[];
  team: TeamStat[];
}

export interface ClientStat {
  id: string | null;
  name: string | null;
  hours: number;
  revenue: number;
  cost: number;
  result: number;
  margin: number | null;
  projects: number;
  payDays: number | null;
}

export interface YearStat {
  year: number;
  firstDay: string | null;
  /** indeks 0–11; null = brak godzin w miesiącu */
  months: Array<MonthStat | null>;
  totals: { hours: number; revenue: number; cost: number; result: number; margin: number | null };
  /** najlepszy / najsłabszy zakończony miesiąc (min. 2 zakończone) */
  bestM: number | null;
  worstM: number | null;
  clients: ClientStat[];
}

const marginOf = (result: number, revenue: number) => (revenue > 0 ? result / revenue : null);

/** Dni robocze pn–pt w miesiącu i ile z nich już minęło (z dzisiejszym). */
export function workdays(year: number, m: number, today: Date) {
  const days = new Date(year, m, 0).getDate();
  let total = 0;
  let done = 0;
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, m - 1, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    total++;
    if (date <= today) done++;
  }
  return { total, done };
}

export function buildYear(data: ResultsYearData, today: Date): YearStat {
  const { year } = data;
  const todayIso = toIso(today);
  const firstMonthKey = data.firstDay ? data.firstDay.slice(0, 7) : null;

  const months: Array<MonthStat | null> = Array.from({ length: 12 }, () => null);
  for (const row of data.months) {
    const m = row.m;
    const monthKey = `${year}-${String(m).padStart(2, '0')}`;
    const revenue = Number(row.revenue);
    const cost = Number(row.labor) + Number(row.expenses);
    const result = revenue - cost;

    const projects: ProjectStat[] = data.projects
      .filter((p) => p.m === m)
      .map((p) => {
        const r = Number(p.revenue) - Number(p.cost);
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          clientId: p.clientId,
          client: p.client,
          hours: Number(p.hours),
          revenue: Number(p.revenue),
          cost: Number(p.cost),
          result: r,
          margin: marginOf(r, Number(p.revenue)),
        };
      })
      .sort((a, b) => b.result - a.result);

    const team: TeamStat[] = data.team
      .filter((t) => t.m === m)
      .map((t) => ({ id: t.id, name: t.name, avatar: t.avatar, hours: Number(t.hours), days: t.days }))
      .sort((a, b) => b.hours - a.hours);

    const absenceByType: Record<string, number> = {};
    for (const a of data.absences.filter((x) => x.m === m)) {
      absenceByType[a.type] = (absenceByType[a.type] ?? 0) + a.days;
    }

    let invoicedSent = 0;
    let paidIn = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let pendingAmount = 0;
    let pendingLastDue: string | null = null;
    for (const inv of data.invoices) {
      const amount = Number(inv.amount);
      if (inv.sent.startsWith(monthKey)) {
        invoicedSent += amount;
        if (!inv.paid) {
          if (inv.due && inv.due < todayIso) {
            overdueAmount += amount;
            overdueCount++;
          } else {
            pendingAmount += amount;
            if (inv.due && (!pendingLastDue || inv.due > pendingLastDue)) pendingLastDue = inv.due;
          }
        }
      }
      if (inv.paid?.startsWith(monthKey)) paidIn += amount;
    }

    // Prognoza tylko dla bieżącego miesiąca, gdy minęło już kilka dni roboczych
    let live: Forecast | null = null;
    if (year === today.getFullYear() && m === today.getMonth() + 1) {
      const { total, done } = workdays(year, m, today);
      if (done >= 3 && done < total) {
        const k = total / done;
        live = {
          hours: Math.round(Number(row.hours) * k),
          revenue: revenue * k,
          cost: cost * k,
          result: result * k,
          done,
          total,
        };
      }
    }

    months[m - 1] = {
      m,
      hours: Number(row.hours),
      revenue,
      cost,
      result,
      margin: marginOf(result, revenue),
      people: row.people,
      projectCount: row.projects,
      personDays: row.personDays,
      weekendDays: row.weekendDays,
      weekendHours: Number(row.weekendHours),
      newProjects: row.newProjects,
      absenceDays: Object.values(absenceByType).reduce((s, d) => s + d, 0),
      absenceByType,
      invoicedSent,
      paidIn,
      overdueAmount,
      overdueCount,
      pendingAmount,
      pendingLastDue,
      live,
      first: firstMonthKey === monthKey && !data.firstDay?.endsWith('-01'),
      firstDay: firstMonthKey === monthKey ? data.firstDay : null,
      projects,
      team,
    };
  }

  const present = months.filter((x): x is MonthStat => !!x);
  const totals = present.reduce(
    (s, x) => ({ hours: s.hours + x.hours, revenue: s.revenue + x.revenue, cost: s.cost + x.cost }),
    { hours: 0, revenue: 0, cost: 0 },
  );
  const totalResult = totals.revenue - totals.cost;

  // najlepszy/najsłabszy tylko spośród pełnych, zakończonych miesięcy
  const closed = present.filter((x) => !x.live && !x.first);
  const best = closed.length >= 2 ? closed.reduce((a, b) => (b.result > a.result ? b : a)) : null;
  const worst = closed.length >= 3 ? closed.reduce((a, b) => (b.result < a.result ? b : a)) : null;

  // klienci roku: suma projektów po kliencie (zwykły obiekt — dane query się serializują)
  const byClient: Record<string, ClientStat & { projectIds: string[] }> = {};
  for (const p of data.projects) {
    const key = p.clientId ?? '—';
    const c = (byClient[key] ??= {
      id: p.clientId,
      name: p.client,
      hours: 0,
      revenue: 0,
      cost: 0,
      result: 0,
      margin: null,
      projects: 0,
      payDays: p.clientId ? (data.clientPayDays[p.clientId] ?? null) : null,
      projectIds: [],
    });
    c.hours += Number(p.hours);
    c.revenue += Number(p.revenue);
    c.cost += Number(p.cost);
    if (!c.projectIds.includes(p.id)) c.projectIds.push(p.id);
  }
  const clients: ClientStat[] = Object.values(byClient)
    .map(({ projectIds, ...c }) => {
      const result = c.revenue - c.cost;
      return { ...c, result, margin: marginOf(result, c.revenue), projects: projectIds.length };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    year,
    firstDay: data.firstDay,
    months,
    totals: { ...totals, result: totalResult, margin: marginOf(totalResult, totals.revenue) },
    bestM: best?.m ?? null,
    worstM: worst && worst.m !== best?.m ? worst.m : null,
    clients,
  };
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

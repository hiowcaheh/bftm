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
  /** kto, jaki typ, ile dni roboczych, od–do */
  absences: Array<{ name: string; type: string; days: number; from: string; to: string }>;
  /** dni robocze pn–pt do dyspozycji (pierwszy miesiąc od startu, bieżący do dziś) */
  workdaysAvail: number;
  /** pełna obsada: osoby × dni robocze × 8 h */
  capacity: number;
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

export interface ProjectYear {
  id: string;
  name: string;
  client: string | null;
  hours: number;
  revenue: number;
  result: number;
  margin: number | null;
}

/** Dodatki karty roku: prognoza, pieniądze, godzina pracy, projekty. */
export interface YearExtra {
  /** prognoza zysku na koniec roku (tylko bieżący rok) */
  forecast: { result: number; avg: number } | null;
  money: {
    sent: number;
    paid: number;
    waiting: number;
    overdue: number;
    overdueCount: number;
    /** gdy po terminie jest dokładnie jedna faktura */
    overdueOne: { client: string | null; sent: string } | null;
    payDays: number | null;
  };
  perHour: { revenue: number; cost: number; profit: number } | null;
  projects: {
    count: number;
    byStatus: Record<string, number>;
    best: ProjectYear | null;
    worst: ProjectYear | null;
  };
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
  extra: YearExtra;
}

const marginOf = (result: number, revenue: number) => (revenue > 0 ? result / revenue : null);

/** Dni robocze pn–pt w miesiącu i ile z nich już minęło (z dzisiejszym). */
/** Wielkanoc (algorytm Meeusa/Jonesa/Butchera) — z niej liczą się święta ruchome. */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Szwedzkie dni wolne wypadające w dni robocze („röda dagar" + Wigilia, Midsommar
 * i Sylwester, kiedy budowy stoją). Klucz „M-D", zwykły obiekt.
 */
function swedishHolidays(year: number): Record<string, true> {
  const key = (d: Date) => `${d.getMonth() + 1}-${d.getDate()}`;
  const plus = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const e = easter(year);
  // Midsommarafton: piątek między 19 a 25 czerwca
  let midsummer = new Date(year, 5, 19);
  while (midsummer.getDay() !== 5) midsummer = plus(midsummer, 1);
  const out: Record<string, true> = {};
  for (const k of ['1-1', '1-6', '5-1', '6-6', '12-24', '12-25', '12-26', '12-31']) out[k] = true;
  for (const d of [plus(e, -2), plus(e, 1), plus(e, 39), midsummer]) out[key(d)] = true;
  return out;
}

/** Dni robocze (pn–pt bez szwedzkich świąt) w miesiącu i ile z nich już minęło. */
export function workdays(year: number, m: number, today: Date) {
  const days = new Date(year, m, 0).getDate();
  const holidays = swedishHolidays(year);
  let total = 0;
  let done = 0;
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, m - 1, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6 || holidays[`${m}-${d}`]) continue;
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

    // Dni robocze do dyspozycji: pierwszy miesiąc liczony od startu danych,
    // bieżący — tylko te, które już minęły
    const isFirst = firstMonthKey === monthKey && !!data.firstDay;
    const isCurrent = year === today.getFullYear() && m === today.getMonth() + 1;
    const wd = workdays(year, m, isCurrent ? today : new Date(year, m, 0));
    const workdaysAvail = isFirst
      ? workdays(year, m, new Date(year, m, 0)).total -
        workdays(year, m, new Date(year, m - 1, Number(data.firstDay!.slice(8)) - 1)).done
      : isCurrent
        ? wd.done
        : wd.total;

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
      absences: data.absences
        .filter((a) => a.m === m && a.name && a.from && a.to)
        .map((a) => ({ name: a.name!, type: a.type, days: a.days, from: a.from!, to: a.to! })),
      workdaysAvail,
      capacity: team.length * workdaysAvail * 8,
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
    extra: buildExtra(data, months, totals, totalResult, today, todayIso),
  };
}

function buildExtra(
  data: ResultsYearData,
  months: Array<MonthStat | null>,
  totals: { hours: number; revenue: number; cost: number },
  totalResult: number,
  today: Date,
  todayIso: string,
): YearExtra {
  // Prognoza roku: wynik do dziś + reszta bieżącego miesiąca + pozostałe miesiące
  // po średniej z ostatnich (maks. 3) pełnych miesięcy — bieżący liczony z prognozy.
  let forecast: YearExtra['forecast'] = null;
  if (data.year === today.getFullYear()) {
    const cur = today.getMonth() + 1;
    const recent = months
      .filter((x): x is MonthStat => !!x && !x.first && x.m <= cur)
      .slice(-3)
      .map((x) => (x.live ? x.live.result : x.result));
    if (recent.length) {
      const avg = recent.reduce((s, r) => s + r, 0) / recent.length;
      const now = months[cur - 1];
      const restOfMonth = now?.live ? now.live.result - now.result : 0;
      forecast = { result: totalResult + restOfMonth + (12 - cur) * avg, avg };
    }
  }

  // Pieniądze roku z faktur (wysłane / opłacone w roku, czekające = bez zapłaty)
  const clientName: Record<string, string> = {};
  for (const p of data.projects) if (p.clientId && p.client) clientName[p.clientId] = p.client;
  let sent = 0;
  let paid = 0;
  let waiting = 0;
  let overdue = 0;
  const overdueList: Array<{ client: string | null; sent: string }> = [];
  const payDays: number[] = [];
  for (const inv of data.invoices) {
    const amount = Number(inv.amount);
    if (inv.sent.startsWith(String(data.year))) sent += amount;
    if (inv.paid?.startsWith(String(data.year))) paid += amount;
    if (inv.paid) {
      payDays.push((Date.parse(inv.paid) - Date.parse(inv.sent)) / 86_400_000);
    } else {
      waiting += amount;
      if (inv.due && inv.due < todayIso) {
        overdue += amount;
        overdueList.push({ client: inv.clientId ? (clientName[inv.clientId] ?? null) : null, sent: inv.sent });
      }
    }
  }

  // Projekty roku: suma po projekcie ze wszystkich miesięcy
  const byId: Record<string, ProjectYear & { cost: number; status: string }> = {};
  for (const p of data.projects) {
    const x = (byId[p.id] ??= {
      id: p.id,
      name: p.name,
      client: p.client,
      status: p.status ?? 'active',
      hours: 0,
      revenue: 0,
      cost: 0,
      result: 0,
      margin: null,
    });
    x.hours += Number(p.hours);
    x.revenue += Number(p.revenue);
    x.cost += Number(p.cost);
  }
  const list = Object.values(byId).map((p) => {
    const result = p.revenue - p.cost;
    return { ...p, result, margin: marginOf(result, p.revenue) };
  });
  const byStatus: Record<string, number> = {};
  for (const p of list) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
  const best = list.length ? list.reduce((a, b) => (b.result > a.result ? b : a)) : null;
  // najsłabszy tylko spośród projektów z przychodem (wewnętrzne bez stawki pomijamy)
  const paid0 = list.filter((p) => p.revenue > 0);
  const worst = paid0.length ? paid0.reduce((a, b) => (b.result < a.result ? b : a)) : null;

  return {
    forecast,
    money: {
      sent,
      paid,
      waiting,
      overdue,
      overdueCount: overdueList.length,
      overdueOne: overdueList.length === 1 ? overdueList[0]! : null,
      payDays: payDays.length ? Math.round(payDays.reduce((s, d) => s + d, 0) / payDays.length) : null,
    },
    perHour:
      totals.hours > 0
        ? {
            revenue: totals.revenue / totals.hours,
            cost: totals.cost / totals.hours,
            profit: totalResult / totals.hours,
          }
        : null,
    projects: {
      count: list.length,
      byStatus,
      best,
      worst: worst && best && worst.id !== best.id ? worst : null,
    },
  };
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

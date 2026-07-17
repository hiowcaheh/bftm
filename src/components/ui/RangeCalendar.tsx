import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface RangeCalendarProps {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
  /** Kolumna z numerem tygodnia ISO po lewej stronie każdego wiersza. */
  showWeekNumbers?: boolean;
}

/**
 * Kalendarz zakresu (styl Booking): pierwszy tap ustawia „od", drugi „do"
 * i zakres rysuje się na kalendarzu; tap wcześniejszej daty zaczyna od nowa.
 * Jeden dzień = tap dwa razy w tę samą datę.
 */
export function RangeCalendar({ from, to, onChange, showWeekNumbers }: RangeCalendarProps) {
  const { t, dateLocale } = useI18n();
  const [month, setMonth] = useState(() => from ?? new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  // Tygodnie po 7 dni (poniedziałek…niedziela) — do kolumny z numerem tygodnia.
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const pick = (day: Date) => {
    if (!from || (from && to)) {
      onChange(day, null); // start nowego wyboru
    } else if (day < from) {
      onChange(day, null); // wcześniejsza data → zaczynamy od nowa
    } else {
      onChange(from, day); // domknięcie zakresu (ten sam dzień = 1 dzień)
    }
  };

  const inRange = (day: Date) =>
    from && to && isWithinInterval(day, { start: from, end: to });

  return (
    <div className="rounded-(--radius-card) bg-white p-3 shadow-(--shadow-card)">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label={t('exp.prevMonth')}
          className="press flex size-9 items-center justify-center rounded-full bg-surface"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(month, 'LLLL yyyy', { locale: dateLocale })}
        </span>
        <button
          type="button"
          aria-label={t('exp.nextMonth')}
          className="press flex size-9 items-center justify-center rounded-full bg-surface"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div
        className={cn(
          'text-center text-[11px] font-medium text-text-secondary',
          showWeekNumbers ? 'grid grid-cols-[2rem_repeat(7,1fr)]' : 'grid grid-cols-7',
        )}
      >
        {showWeekNumbers && <span className="py-1 text-text-secondary/50">v.</span>}
        {t('ui.weekdays').split('|').map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="flex flex-col">
        {weeks.map((week) => (
          <div
            key={week[0]!.toISOString()}
            className={cn(
              showWeekNumbers ? 'grid grid-cols-[2rem_repeat(7,1fr)]' : 'grid grid-cols-7',
            )}
          >
            {showWeekNumbers && (
              <span className="tabular-nums flex h-11 items-center justify-center text-[11px] font-medium text-text-secondary/60">
                {getISOWeek(week[0]!)}
              </span>
            )}
            {week.map((day) => {
              const isFrom = from && isSameDay(day, from);
              const isTo = to && isSameDay(day, to);
              const between = inRange(day) && !isFrom && !isTo;
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => pick(day)}
                  className={cn(
                    'tabular-nums relative flex h-11 items-center justify-center text-sm',
                    !isSameMonth(day, month) && 'text-text-secondary/40',
                    between && 'bg-accent-soft',
                    (isFrom || isTo) && 'font-semibold',
                    isFrom && (to ? 'rounded-l-full' : 'rounded-full'),
                    isTo && 'rounded-r-full',
                    (isFrom || isTo) && 'bg-accent text-white',
                    !isFrom && !isTo && isToday(day) && 'font-semibold text-accent',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

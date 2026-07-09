import { useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface RangeCalendarProps {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
}

/**
 * Kalendarz zakresu (styl Booking): pierwszy tap ustawia „od", drugi „do"
 * i zakres rysuje się na kalendarzu; tap wcześniejszej daty zaczyna od nowa.
 * Jeden dzień = tap dwa razy w tę samą datę.
 */
export function RangeCalendar({ from, to, onChange }: RangeCalendarProps) {
  const [month, setMonth] = useState(() => from ?? new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

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
          aria-label="Poprzedni miesiąc"
          className="press flex size-9 items-center justify-center rounded-full bg-surface"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(month, 'LLLL yyyy', { locale: pl })}
        </span>
        <button
          type="button"
          aria-label="Następny miesiąc"
          className="press flex size-9 items-center justify-center rounded-full bg-surface"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-text-secondary">
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
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
    </div>
  );
}

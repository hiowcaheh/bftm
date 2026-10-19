import { useId, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RangeCalendar } from '@/components/ui/RangeCalendar';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n/context';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Pole daty formularzy godzin: niski przycisk (wysokość jak Dziś/Wczoraj),
 * który rozwija kalendarz w stylu nieobecności (wybór jednego dnia).
 */
export function DayPickerField({
  value,
  onChange,
}: {
  /** yyyy-MM-dd */
  value: string;
  onChange: (value: string) => void;
}) {
  const { t, dateLocale } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const today = iso(new Date());
  const yesterday = iso(subDays(new Date(), 1));
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={id} className="text-xs font-medium text-text-secondary">
            {t('ts.date')}
          </label>
          <button
            id={id}
            type="button"
            aria-expanded={open}
            className={cn(
              'press flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-white pl-3 pr-2.5 text-left text-[1rem]',
              open ? 'border-accent' : 'border-line',
            )}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="truncate">
              {format(parseISO(value), 'EEE d MMM yyyy', { locale: dateLocale })}
            </span>
            <CalendarDays
              className={cn('size-4.5 shrink-0', open ? 'text-accent' : 'text-text-secondary')}
              strokeWidth={1.8}
            />
          </button>
        </div>
        <Button
          variant={value === today ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => pick(today)}
        >
          {t('ts.todayBtn')}
        </Button>
        <Button
          variant={value === yesterday ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => pick(yesterday)}
        >
          {t('ts.yesterdayBtn')}
        </Button>
      </div>
      {open && (
        <RangeCalendar
          single
          from={parseISO(value)}
          to={parseISO(value)}
          onChange={(day) => {
            if (day) pick(iso(day));
            else setOpen(false);
          }}
        />
      )}
    </div>
  );
}

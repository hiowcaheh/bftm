import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { num } from '@/lib/format';
import { useT } from '@/lib/i18n/context';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  suffix?: string;
  className?: string;
}

/** Stepper ±step z dużymi celami dotykowymi — np. godziny co 0,5 h. */
export function NumberStepper({
  value,
  onChange,
  step = 0.5,
  min = 0,
  max = 24,
  label,
  suffix,
  className,
}: NumberStepperProps) {
  const t = useT();
  const dec = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.min(max, Math.round((value + step) * 100) / 100));

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-xs font-medium text-text-secondary">{label}</span>}
      <div className="flex items-center justify-between rounded-(--radius-input) border border-line bg-white p-1.5">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={t('ui.decrease')}
          className="press flex size-11 items-center justify-center rounded-lg bg-surface text-text disabled:opacity-30"
        >
          <Minus className="size-5" />
        </button>
        <span className="tabular-nums text-lg font-semibold">
          {num(value)}
          {suffix && <span className="ml-1 text-sm font-normal text-text-secondary">{suffix}</span>}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={t('ui.increase')}
          className="press flex size-11 items-center justify-center rounded-lg bg-surface text-text disabled:opacity-30"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

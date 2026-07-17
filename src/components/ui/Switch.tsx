import { cn } from '@/lib/cn';
import { translate } from '@/lib/i18n/context';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Widoczna etykieta po lewej stronie suwaka */
  label?: string;
  /** Drobny opis pod etykietą — do wyjaśnienia, co przełącznik robi */
  description?: string;
  /** Etykieta tylko dla czytników ekranu (gdy tekst renderuje rodzic) */
  hideLabel?: boolean;
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
  hideLabel,
}: SwitchProps) {
  const toggle = (
    <span
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative inline-block h-8 w-13 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-line',
        disabled && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </span>
  );

  if (!label || hideLabel) {
    return (
      <button
        type="button"
        aria-label={label ?? translate('ui.toggle')}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="shrink-0"
      >
        {toggle}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-medium', disabled && 'opacity-40')}>
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-text-secondary">{description}</span>
        )}
      </span>
      {toggle}
    </button>
  );
}

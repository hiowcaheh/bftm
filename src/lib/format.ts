import { format as formatDate } from 'date-fns';
import { activeDateLocale } from '@/lib/i18n/context';

const sekFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sekWholeFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** „12 345,50 kr" */
export function money(value: number): string {
  return sekFormatter.format(value);
}

/** „12 346 kr" — do KPI, gdzie grosze to szum */
export function moneyWhole(value: number): string {
  return sekWholeFormatter.format(value);
}

/** „8,5 h" */
export function hours(value: number): string {
  return `${numberFormatter.format(value)} h`;
}

/** „12 345,5" bez waluty */
export function num(value: number): string {
  return numberFormatter.format(value);
}

/** „07.01.2026" */
export function date(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return formatDate(d, 'dd.MM.yyyy', { locale: activeDateLocale() });
}

/** „wtorek, 7 stycznia" */
export function dateLong(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return formatDate(d, 'EEEE, d MMMM', { locale: activeDateLocale() });
}

/** „styczeń 2026" */
export function monthYear(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return formatDate(d, 'LLLL yyyy', { locale: activeDateLocale() });
}

/** „2026-01-07" — format dla kolumn date w Postgresie */
export function isoDate(value: Date): string {
  return formatDate(value, 'yyyy-MM-dd');
}

/** Inicjały do awatarów: „Jan Kowalski" → „JK" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => (part[0] ?? '').toUpperCase())
    .join('');
}

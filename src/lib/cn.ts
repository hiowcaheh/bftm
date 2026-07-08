import { clsx, type ClassValue } from 'clsx';

/** Składanie klas warunkowych. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

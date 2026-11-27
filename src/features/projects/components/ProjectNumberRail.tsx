import { readableProjectColor } from '../projectNumber';

/**
 * Szyna z numerem projektu (wariant B8): kolorowa krawędź + jasny odcień koloru
 * projektu, znaki jeden pod drugim, „P” w kolorze projektu. Zastępuje cienki
 * pasek tylko w projektach, które mają numer.
 */
export function ProjectNumberRail({ number, color }: { number: string; color: string }) {
  const chars = number.trim().split('');
  return (
    <div
      aria-label={number}
      className="flex w-[30px] shrink-0 flex-col items-center justify-center gap-px border-l-4 font-mono text-[12.5px] leading-[1.15]"
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={i === 0 ? 'font-extrabold' : 'font-semibold text-text/80'}
          style={i === 0 ? { color: readableProjectColor(color) } : undefined}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

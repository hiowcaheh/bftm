import { cn } from '@/lib/cn';

/** Delikatna, falowana kreska oddzielająca sekcje. */
export function WavyDivider({ className }: { className?: string }) {
  const seg = 16; // szerokość półfali
  const n = 24; // liczba segmentów
  let d = `M0 7 q ${seg / 2} -5 ${seg} 0`;
  for (let i = 1; i < n; i++) d += ` t ${seg} 0`;
  const width = seg * n;

  return (
    <div className={cn('flex justify-center py-1', className)} aria-hidden>
      <svg
        viewBox={`0 0 ${width} 14`}
        width="100%"
        height="12"
        preserveAspectRatio="none"
        className="max-w-xs text-accent/30"
      >
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

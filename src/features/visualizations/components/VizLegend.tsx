import type { CSSProperties } from 'react';

interface VizLegendProps {
  todoLabel: string;
  doneLabel: string;
  skyliftLabel: string;
  totalLabel: string;
  todoCount: number;
  doneCount: number;
  skyliftCount: number;
  total: number;
  style?: CSSProperties;
}

function Row({ color, s, label, count }: { color: string; s?: boolean; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-white text-[8px] font-extrabold text-white"
        style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,.35)' }}
      >
        {s ? 'S' : ''}
      </span>
      <span className="flex-1">{label}</span>
      <span className="tabular-nums font-semibold">{count}</span>
    </div>
  );
}

/** Legenda punktów w rogu mapy — z licznikami per status i sumą. */
export function VizLegend({
  todoLabel,
  doneLabel,
  skyliftLabel,
  totalLabel,
  todoCount,
  doneCount,
  skyliftCount,
  total,
  style,
}: VizLegendProps) {
  return (
    <div
      className="pointer-events-none absolute right-3 z-10 flex w-[9.5rem] flex-col gap-1.5 rounded-xl bg-black/60 px-3 py-2.5 text-[11px] font-medium text-white backdrop-blur"
      style={{ top: '0.75rem', ...style }}
    >
      <Row color="#cc0000" label={todoLabel} count={todoCount} />
      <Row color="#2e7d32" label={doneLabel} count={doneCount} />
      <Row color="#cc0000" s label={skyliftLabel} count={skyliftCount} />
      <div className="mt-0.5 flex justify-between border-t border-white/20 pt-1.5">
        <span>{totalLabel}</span>
        <span className="tabular-nums font-semibold">{total}</span>
      </div>
    </div>
  );
}

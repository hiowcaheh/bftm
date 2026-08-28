import type { CSSProperties } from 'react';

interface VizLegendProps {
  todoLabel: string;
  doneLabel: string;
  skyliftLabel: string;
  totalLabel: string;
  todoCount: number;
  doneCount: number;
  /** Skylift dzieli się na niezrobione (czerwone) i gotowe (zielone). */
  skyliftTodo: number;
  skyliftDone: number;
  total: number;
  style?: CSSProperties;
}

function Dot({ color, s }: { color: string; s?: boolean }) {
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-white text-[8px] font-extrabold text-white"
      style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,.35)' }}
    >
      {s ? 'S' : ''}
    </span>
  );
}

/** Legenda punktów w rogu mapy — liczniki per status + skylift (gotowe/niezrobione) + suma. */
export function VizLegend({
  todoLabel,
  doneLabel,
  skyliftLabel,
  totalLabel,
  todoCount,
  doneCount,
  skyliftTodo,
  skyliftDone,
  total,
  style,
}: VizLegendProps) {
  return (
    <div
      className="pointer-events-none absolute right-3 z-10 flex w-[10.5rem] flex-col gap-1.5 rounded-xl bg-black/60 px-3 py-2.5 text-[11px] font-medium text-white backdrop-blur"
      style={{ top: '0.75rem', ...style }}
    >
      <div className="flex items-center gap-2">
        <Dot color="#cc0000" />
        <span className="flex-1">{todoLabel}</span>
        <span className="tabular-nums font-semibold">{todoCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <Dot color="#2e7d32" />
        <span className="flex-1">{doneLabel}</span>
        <span className="tabular-nums font-semibold">{doneCount}</span>
      </div>
      {/* Skylift — atrybut, dzieli się na niezrobione/gotowe */}
      <div className="flex items-center gap-2">
        <span
          className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-white bg-neutral-500 text-[8px] font-extrabold text-white"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,.35)' }}
        >
          S
        </span>
        <span className="flex-1">{skyliftLabel}</span>
        <span className="tabular-nums font-semibold">
          <span style={{ color: '#ff6b6b' }}>{skyliftTodo}</span>
          <span className="text-white/40"> / </span>
          <span style={{ color: '#5fd08a' }}>{skyliftDone}</span>
        </span>
      </div>
      <div className="mt-0.5 flex justify-between border-t border-white/20 pt-1.5">
        <span>{totalLabel}</span>
        <span className="tabular-nums font-semibold">{total}</span>
      </div>
    </div>
  );
}

interface VizLegendProps {
  todoLabel: string;
  doneLabel: string;
  skyliftLabel: string;
  totalLabel: string;
  total: number;
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

/** Legenda punktów w prawym górnym rogu mapy — czytelna na tle satelity. */
export function VizLegend({ todoLabel, doneLabel, skyliftLabel, totalLabel, total }: VizLegendProps) {
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col gap-1.5 rounded-xl bg-black/55 px-3 py-2.5 text-[11px] font-medium text-white backdrop-blur">
      <div className="flex items-center gap-2">
        <Dot color="#cc0000" /> {todoLabel}
      </div>
      <div className="flex items-center gap-2">
        <Dot color="#2e7d32" /> {doneLabel}
      </div>
      <div className="flex items-center gap-2">
        <Dot color="#cc0000" s /> {skyliftLabel}
      </div>
      <div className="mt-0.5 border-t border-white/20 pt-1.5 tabular-nums">
        {totalLabel}: {total}
      </div>
    </div>
  );
}

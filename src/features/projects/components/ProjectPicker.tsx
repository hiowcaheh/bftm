import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { inputClasses } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { readableProjectColor } from '../projectNumber';

export interface PickerProject {
  id: string;
  name: string;
  number: string | null;
  color: string | null;
  clientName: string | null;
}

interface ProjectPickerProps {
  label?: string;
  projects: PickerProject[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}

/**
 * Wybór projektu z wyszukiwaniem po numerze, nazwie i kliencie — zamiast
 * natywnej listy, w której przy kilkudziesięciu projektach nie da się szukać.
 */
export function ProjectPicker({ label, projects, value, onChange, placeholder }: ProjectPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = projects.find((p) => p.id === value) ?? null;

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      q
        ? projects.filter((p) =>
            [p.number, p.name, p.clientName].some((v) => (v ?? '').toLowerCase().includes(q)),
          )
        : projects,
    [projects, q],
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-medium text-text-secondary">{label}</span>}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(inputClasses(false), 'flex items-center justify-between gap-2 text-left')}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              {selected.number && (
                <NumberChip number={selected.number} color={selected.color ?? '#CC0000'} />
              )}
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-text-secondary/60">{placeholder}</span>
          )}
          <ChevronDown className="size-5 shrink-0 text-text-secondary" />
        </button>
      ) : (
        <div className="overflow-hidden rounded-xl border-[1.5px] border-text">
          <div className="flex h-12 items-center gap-2.5 border-b border-line px-3.5">
            <Search className="size-[18px] shrink-0 text-text-secondary" />
            <input
              ref={inputRef}
              value={query}
              placeholder={t('proj.pickerSearch')}
              aria-label={t('proj.pickerSearch')}
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[1rem]"
              // globalny :focus-visible rysuje czerwoną ramkę — tu fokus pokazuje obramowanie listy
              style={{ outline: 'none' }}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => (query ? setQuery('') : close())}
              className="press flex size-6 shrink-0 items-center justify-center rounded-full bg-line text-text-secondary"
            >
              <X className="size-3.5" strokeWidth={3} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {list.length === 0 ? (
              <p className="px-3.5 py-4 text-center text-sm text-text-secondary">
                {t('proj.pickerEmpty')}
              </p>
            ) : (
              list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === value}
                  onClick={() => {
                    onChange(p.id);
                    close();
                  }}
                  className={cn(
                    'flex min-h-[58px] w-full items-center gap-3 border-b border-line/60 px-3.5 py-2 text-left last:border-b-0 active:bg-bg',
                    p.id === value && 'bg-bg',
                  )}
                >
                  {p.number && <NumberChip number={p.number} color={p.color ?? '#CC0000'} />}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-semibold">{p.name}</span>
                    {p.clientName && (
                      <span className="truncate text-xs text-text-secondary">{p.clientName}</span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Numer projektu jak na szynie karty (B8), tylko poziomo. */
function NumberChip({ number, color }: { number: string; color: string }) {
  return (
    <span
      className="shrink-0 rounded-r-md border-l-[3px] px-2 py-1 font-mono text-[13px] font-bold tracking-wide"
      style={{
        borderColor: color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        color: readableProjectColor(color),
      }}
    >
      {number}
    </span>
  );
}

interface StatusSliderProps {
  status: 'todo' | 'done';
  disabled?: boolean;
  onChange: (status: 'todo' | 'done') => void;
  todoLabel: string;
  doneLabel: string;
}

/**
 * Nowoczesny przełącznik statusu punktu — płynny „slide" lewo/prawo.
 * Lewo = niezrobione (czerwień), prawo = gotowe (zieleń).
 */
export function StatusSlider({
  status,
  disabled,
  onChange,
  todoLabel,
  doneLabel,
}: StatusSliderProps) {
  const done = status === 'done';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={done}
      disabled={disabled}
      onClick={() => onChange(done ? 'todo' : 'done')}
      className="relative flex h-12 w-full items-stretch overflow-hidden rounded-full bg-surface p-1 select-none disabled:opacity-50"
    >
      {/* Suwak */}
      <span
        className="absolute top-1 bottom-1 left-1 rounded-full shadow transition-all duration-300 ease-out"
        style={{
          width: 'calc(50% - 0.25rem)',
          transform: done ? 'translateX(100%)' : 'translateX(0)',
          backgroundColor: done ? '#2e7d32' : '#cc0000',
        }}
      />
      <span
        className="relative z-10 flex w-1/2 items-center justify-center gap-1.5 text-sm font-semibold transition-colors duration-200"
        style={{ color: done ? 'var(--color-text-secondary)' : '#fff' }}
      >
        {todoLabel}
      </span>
      <span
        className="relative z-10 flex w-1/2 items-center justify-center gap-1.5 text-sm font-semibold transition-colors duration-200"
        style={{ color: done ? '#fff' : 'var(--color-text-secondary)' }}
      >
        {doneLabel}
      </span>
    </button>
  );
}

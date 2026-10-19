import { useEffect, useRef, useState } from 'react';

/**
 * Liczba „nabijająca się" od zera do wartości (~0,8 s) — tylko przy pierwszym
 * pokazaniu po wejściu na Pulpit. Późniejsze odświeżenia danych podmieniają
 * wartość od razu, bez animacji. Z „Ogranicz ruch" — od razu wartość.
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState<number | null>(null);
  const animated = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animated.current || reduced) {
      animated.current = true;
      setShown(value);
      return;
    }
    animated.current = true;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 800);
      const eased = 1 - (1 - k) ** 3;
      // w trakcie liczby całkowite, na końcu dokładna wartość (np. 162,5 h)
      setShown(k < 1 ? Math.round(value * eased) : value);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{format(shown ?? 0)}</>;
}

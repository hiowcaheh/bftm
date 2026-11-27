/**
 * Numer projektu (0084): „P2612”, od 2027 „P2701”… Mateusz wpisuje go sam,
 * aplikacja tylko podpowiada kolejny po najwyższym istniejącym.
 */

/** Zapis jak w bazie: bez spacji, wielkie litery; puste pole = brak numeru. */
export function normalizeProjectNumber(value: string): string | null {
  const v = value.replace(/\s+/g, '').toUpperCase();
  return v || null;
}

/** Porównanie jak indeks unikalny w bazie (upper + trim). */
export function sameProjectNumber(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.trim().toUpperCase() === b.trim().toUpperCase();
}

export interface NumberSuggestion {
  previous: string;
  previousName: string;
  next: string;
}

/**
 * Najwyższy numer w formacie litery + cyfry (P2612) i kolejny (P2613).
 * W styczniu wystarczy raz wpisać P2701 — od niego liczy się dalej P2702.
 */
export function suggestProjectNumber(
  projects: ReadonlyArray<{ id: string; name: string; number: string | null }>,
  excludeId?: string,
): NumberSuggestion | null {
  let best: { num: string; name: string; value: number; prefix: string; digits: number } | null =
    null;
  for (const p of projects) {
    if (!p.number || p.id === excludeId) continue;
    const m = /^([A-Z]*)(\d+)$/i.exec(p.number.trim());
    if (!m) continue;
    const [, prefix = '', digits = ''] = m;
    const value = Number(digits);
    if (!best || value > best.value) {
      best = { num: p.number, name: p.name, value, prefix: prefix.toUpperCase(), digits: digits.length };
    }
  }
  if (!best) return null;
  return {
    previous: best.num,
    previousName: best.name,
    next: best.prefix + String(best.value + 1).padStart(best.digits, '0'),
  };
}

const lum = (rgb: number[]) => {
  const c = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};

/**
 * Kolor projektu przyciemniany, aż „P” będzie czytelne na jasnym tle szyny
 * (≥ 5,2:1 na białym ≈ 4,5:1 na tincie) — żółty czy jasnoniebieski inaczej znika.
 */
export function readableProjectColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'var(--color-text)';
  let rgb = [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16));
  for (let i = 0; i < 25 && 1.05 / (lum(rgb) + 0.05) < 5.2; i++) rgb = rgb.map((v) => v * 0.9);
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { enGB, pl, sv, uk } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { dicts } from './dict';
import type { Lang } from './types';
import { LANGS } from './types';

const KEY = 'bftm-lang';
const dateLocales: Record<Lang, Locale> = { pl, sv, en: enGB, uk };

function detect(): Lang {
  const saved = localStorage.getItem(KEY) as Lang | null;
  if (saved && LANGS.some((l) => l.code === saved)) return saved;
  return 'pl';
}

function lookup(obj: unknown, path: string): string | undefined {
  const val = path.split('.').reduce<unknown>((o, k) => {
    if (o && typeof o === 'object') return (o as Record<string, unknown>)[k];
    return undefined;
  }, obj);
  return typeof val === 'string' ? val : undefined;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

/** Tłumaczenie klucza dla danego języka (z fallbackiem na PL, potem klucz). */
function tr(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const s = lookup(dicts[lang], key) ?? lookup(dicts.pl, key) ?? key;
  return interpolate(s, vars);
}

/**
 * Liczba mnoga: wybiera kategorię (`one`/`few`/`many`/`other`) przez
 * `Intl.PluralRules` i zwraca odpowiednią formę spod `key`.
 */
function trPlural(lang: Lang, key: string, count: number): string {
  const cat = new Intl.PluralRules(lang).select(count);
  return lookup(dicts[lang], `${key}.${cat}`) ?? lookup(dicts[lang], `${key}.other`) ?? lookup(dicts.pl, `${key}.${cat}`) ?? lookup(dicts.pl, `${key}.other`) ?? key;
}

type TFn = (key: string, vars?: Record<string, string | number>) => string;
type TPFn = (key: string, count: number) => string;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
  tp: TPFn;
  dateLocale: Locale;
}

const Ctx = createContext<I18nCtx | null>(null);

// Aktualny język na poziomie modułu — dla `translate`/`translateP`
// używanych poza Reactem (np. toasty w hookach mutacji).
let activeLang: Lang = detect();

/** Tłumaczenie poza Reactem (używa aktualnie wybranego języka). */
export function translate(key: string, vars?: Record<string, string | number>): string {
  return tr(activeLang, key, vars);
}

/** Locale date-fns aktualnego języka — dla helperów poza Reactem (format.ts). */
export function activeDateLocale(): Locale {
  return dateLocales[activeLang];
}


/** Tłumaczenie w KONKRETNYM języku — np. powiadomienia w języku odbiorcy. */
export function translateFor(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  return tr(lang, key, vars);
}

/** Locale date-fns konkretnego języka (daty w powiadomieniach dla odbiorcy). */
export function dateLocaleFor(lang: Lang): Locale {
  return dateLocales[lang];
}

/** Liczba mnoga poza Reactem. */
export function translateP(key: string, count: number): string {
  return trPlural(activeLang, key, count);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  useEffect(() => {
    document.documentElement.lang = lang;
    activeLang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(KEY, l);
    activeLang = l;
    setLangState(l);
  }, []);

  const t = useCallback<TFn>((key, vars) => tr(lang, key, vars), [lang]);
  const tp = useCallback<TPFn>((key, count) => trPlural(lang, key, count), [lang]);

  return (
    <Ctx.Provider value={{ lang, setLang, t, tp, dateLocale: dateLocales[lang] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n musi być użyte wewnątrz I18nProvider');
  return c;
}

/** Skrót do samej funkcji tłumaczącej. */
export function useT(): TFn {
  return useI18n().t;
}

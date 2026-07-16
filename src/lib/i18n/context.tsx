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

type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
  dateLocale: Locale;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      let s = lookup(dicts[lang], key) ?? lookup(dicts.pl, key) ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return s;
    },
    [lang],
  );

  return (
    <Ctx.Provider value={{ lang, setLang, t, dateLocale: dateLocales[lang] }}>
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

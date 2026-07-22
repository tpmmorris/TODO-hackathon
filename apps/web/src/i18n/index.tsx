import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { type Language, type TranslationKey, translations } from './translations';

const STORAGE_KEY = 'gpnow-lang';

type TranslateParams = Record<string, string | number>;

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'cy' || value === 'pl';
}

function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) return stored;
  const browser = window.navigator.language.slice(0, 2).toLowerCase();
  if (isLanguage(browser)) return browser;
  return 'en';
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectInitialLanguage);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => {
      const table = translations[lang] ?? translations.en;
      const template = table[key] ?? translations.en[key] ?? key;
      return interpolate(template, params);
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}

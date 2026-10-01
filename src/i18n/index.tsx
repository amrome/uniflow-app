import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ar } from './ar';
import { en } from './en';

type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type Translations = Widen<typeof en>;
export type Language = 'en' | 'ar';

const dictionaries: Record<Language, Translations> = { en, ar };
const STORAGE_KEY = 'uniflow.language';

type I18nContextValue = {
  language: Language;
  isRTL: boolean;
  t: Translations;
  setLanguage: (l: Language) => void;
  toggleLanguage: () => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'ar') setLanguageState(v);
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      isRTL: language === 'ar',
      t: dictionaries[language],
      setLanguage,
      toggleLanguage: () => setLanguage(language === 'en' ? 'ar' : 'en'),
    }),
    [language, setLanguage],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Fills `{key}` placeholders: fmt('Hi, {name}', { name: 'Amro' }). */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

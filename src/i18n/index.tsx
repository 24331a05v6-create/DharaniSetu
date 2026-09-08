'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LANG, STORAGE_KEY, isLanguageCode } from './languages';
import en, { type Dict } from './dictionaries/en';
import hi from './dictionaries/hi';
import te from './dictionaries/te';
import ta from './dictionaries/ta';
import kn from './dictionaries/kn';
import ml from './dictionaries/ml';

const DICTS: Record<string, Dict> = { en, hi, te, ta, kn, ml };

interface LanguageContextType {
  lang: string;
  setLang: (code: string) => void;
  t: Dict;
}

const LanguageContext = createContext<LanguageContextType>({ lang: DEFAULT_LANG, setLang: () => {}, t: en });

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguageCode(saved)) setLangState(saved);
    } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch { /* noop */ }
  }, [lang]);

  const setLang = useCallback((code: string) => {
    if (!isLanguageCode(code)) return;
    setLangState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch { /* private mode */ }
  }, []);

  const value = useMemo<LanguageContextType>(
    () => ({ lang, setLang, t: DICTS[lang] || en }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { en, type Dictionary } from './dictionaries/en';
import { ko } from './dictionaries/ko';
import { DEFAULT_LANGUAGE, languages, type LanguageCode } from './languages';

const STORAGE_KEY = 'lawyer_general_config';

const dictionaries: Record<LanguageCode, Dictionary<typeof en>> = { en, ko };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;

type Paths<T> = T extends string
  ? never
  : T extends readonly unknown[]
  ? never
  : { [K in keyof T]: T[K] extends string ? K & string : Join<K & string, Paths<T[K]>> }[keyof T];

export type TranslationKey = Paths<typeof en>;

function getValue(dict: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, dict) as string | undefined;
}

function readStoredLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    const code = parsed?.language;
    return languages.some((l) => l.code === code) ? code : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  dict: Dictionary<typeof en>;
}

const defaultContextValue: LanguageContextValue = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key: TranslationKey): string => getValue(en, key) ?? key,
  dict: en,
};

const LanguageContext = createContext<LanguageContextValue>(defaultContextValue);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(readStoredLanguage());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLanguageState(readStoredLanguage());
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('language-config-changed', onStorage as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('language-config-changed', onStorage as EventListener);
    };
  }, []);

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, language: next }));
      window.dispatchEvent(new Event('language-config-changed'));
    } catch {}
  };

  const dict = dictionaries[language];
  const t = (key: TranslationKey): string => getValue(dict, key) ?? getValue(en, key) ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dict }}>{children}</LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

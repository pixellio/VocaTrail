'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from '@/lib/languagePreference';

interface LanguageContextValue {
  language: string;
  setLanguage: (code: string) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  // Hydrate from localStorage after mount only, so server-rendered HTML
  // (always DEFAULT_LANGUAGE) matches the first client render.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored) setLanguageState(stored);
    } catch {
      // localStorage unavailable (private mode, etc.) — stay on default.
    }
  }, []);

  const setLanguage = (code: string) => {
    setLanguageState(code);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Best effort — nothing else to do if storage isn't available.
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

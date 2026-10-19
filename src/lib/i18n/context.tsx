"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, Translations, translations } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof Translations, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "easystock_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // 1. Check localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === "en" || saved === "am") {
      setLanguageState(saved);
      return;
    }

    // 2. Check cookies
    const cookieMatch = document.cookie.match(/easystock_lang=(en|am)/);
    if (cookieMatch) {
      setLanguageState(cookieMatch[1] as Language);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.cookie = `easystock_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore if localStorage unavailable
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "am" : "en");
  };

  const t = (key: keyof Translations, fallback?: string): string => {
    const currentDict = translations[language] || translations.en;
    if (key in currentDict) {
      return currentDict[key];
    }
    return fallback || translations.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for non-provider usage
    return {
      language: "en" as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: keyof Translations, fallback?: string) => {
        return translations.en[key] || fallback || String(key);
      },
    };
  }
  return context;
}

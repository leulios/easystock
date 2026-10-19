"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/context";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold select-none ${className}`}
      title="Switch Language / ቋንቋ ይቀይሩ"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
          language === "en"
            ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
        }`}
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage("am")}
        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
          language === "am"
            ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
        }`}
      >
        <span>🇪🇹</span>
        <span>አማርኛ</span>
      </button>
    </div>
  );
}

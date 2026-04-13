import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import en from "../locales/en.json";
import ko from "../locales/ko.json";
import th from "../locales/th.json";

export type Lang = "en" | "ko" | "th";

export type Translations = typeof en;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeTranslations<T extends Record<string, unknown>>(base: T, overrides: Record<string, unknown>): T {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const current = merged[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = mergeTranslations(current, value);
    } else {
      merged[key] = value;
    }
  }

  return merged as T;
}

const DICTIONARIES: Record<Lang, Translations> = {
  en,
  ko: mergeTranslations(en, ko as Record<string, unknown>),
  th: mergeTranslations(en, th as Record<string, unknown>),
};

const STORAGE_KEY = "smfi_lang";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSavedLang(): Lang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ko" || saved === "th") return saved as Lang;
  } catch { /* ignore */ }
  return null;
}

function getBrowserLang(): Lang {
  const nav = navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("th")) return "th";
  return "en";
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface LangContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  t: en,
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  // Priority: localStorage > (async) IP > navigator.language
  const [lang, setLangState] = useState<Lang>(() => getSavedLang() ?? getBrowserLang());

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  };

  useEffect(() => {
    // If user already has a saved preference, skip geo-detection
    if (getSavedLang()) return;

    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        const country: string = data?.country_code ?? "";
        if (country === "KR") setLangState("ko");
        else if (country === "TH") setLangState("th");
        else setLangState("en");
      })
      .catch(() => {
        // Fallback: navigator.language (already set as initial state)
      });
  }, []);

  return (
    <LangContext.Provider value={{ lang, t: DICTIONARIES[lang], setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

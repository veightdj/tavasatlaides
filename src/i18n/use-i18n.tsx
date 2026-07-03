import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { dict, type Lang, type Dict, LANGS } from "./dictionaries";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
};

const I18nContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "dealslv.lang";

function detect(): Lang {
  if (typeof window === "undefined") return "lv";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && stored in dict) return stored;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("en")) return "en";
  return "lv";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("lv");
  const qc = useQueryClient();

  useEffect(() => {
    setLangState(detect());
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
    // Rehydrate locale-derived caches (category names, etc).
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dict[lang] }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { LANGS };

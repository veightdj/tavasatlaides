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

  const raw = dict[lang];
  const t = (import.meta.env?.DEV ? wrapDictForDev(raw, lang) : raw) as Dict;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

/**
 * Dev-only Proxy that logs a `console.error` when code reads an undefined
 * dictionary key. Never runs in production builds.
 */
function wrapDictForDev(node: unknown, lang: Lang, path = ""): unknown {
  if (node === null || typeof node !== "object" || Array.isArray(node)) return node;
  return new Proxy(node as Record<string, unknown>, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol" || prop === "then") return Reflect.get(target, prop, receiver);
      const value = Reflect.get(target, prop, receiver);
      const full = path ? `${path}.${String(prop)}` : String(prop);
      if (value === undefined) {
        // eslint-disable-next-line no-console
        console.error(`[i18n] Missing key "${full}" for locale "${lang}"`);
        return "";
      }
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return wrapDictForDev(value, lang, full);
      }
      return value;
    },
  });
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { LANGS };

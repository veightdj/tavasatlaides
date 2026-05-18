import { useEffect, useState, useCallback } from "react";

const KEY_FAV = "dealslv.favorites";
const KEY_STORES = "dealslv.savedStores";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function write(key: string, ids: string[]) {
  window.localStorage.setItem(key, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(`${key}:change`));
}

function useStringSet(key: string) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read(key));
    const onChange = () => setIds(read(key));
    window.addEventListener(`${key}:change`, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(`${key}:change`, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [key]);

  const toggle = useCallback((id: string) => {
    const cur = read(key);
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    write(key, next);
  }, [key]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, has };
}

export const useFavorites = () => useStringSet(KEY_FAV);
export const useSavedStores = () => useStringSet(KEY_STORES);
